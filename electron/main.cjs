'use strict';

/**
 * RestoMaster OS — processus principal Electron.
 * Remplace l'ancien shell Tauri : fenêtre unique, CSP stricte, et IPC natifs
 * (enregistrement de fichiers, impression TCP/Windows, liens, presse-papiers).
 */
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  clipboard,
  powerSaveBlocker,
  session,
} = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const net = require('node:net');
const dns = require('node:dns').promises;
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');

const DEV_URL = process.env.ELECTRON_START_URL || '';
const MAX_PRINT_BYTES = 1_048_576;
const DEFAULT_PRINT_TIMEOUT_MS = 5_000;

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://firebasestorage.googleapis.com",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'wss://*.firebaseio.com',
    'https://*.firebaseapp.com',
    'https://firebaseinstallations.googleapis.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://firestore.googleapis.com',
    'https://*.cloudfunctions.net',
    'https://*.run.app',
    'https://api.cloudinary.com',
  ].join(' '),
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {number | null} */
let powerBlockerId = null;

// -----------------------------------------------------------------------------
// Utilitaires d'impression
// -----------------------------------------------------------------------------
function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd');
  }
  return false;
}

async function printTcp({ host, port, bytes, timeoutMs }) {
  const cleanHost = String(host || '').trim();
  if (!cleanHost) throw new Error('L’adresse de l’imprimante est vide.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Le port de l’imprimante doit être compris entre 1 et 65535.');
  }
  const buffer = Buffer.from(bytes || []);
  if (buffer.length === 0) throw new Error('Le ticket d’impression est vide.');
  if (buffer.length > MAX_PRINT_BYTES) {
    throw new Error('Le ticket d’impression dépasse la taille maximale autorisée (1 Mo).');
  }

  const address = `${cleanHost}:${port}`;
  const resolved = net.isIP(cleanHost)
    ? cleanHost
    : (await dns.lookup(cleanHost).catch((error) => {
        throw new Error(`Adresse d’imprimante invalide (${address}) : ${error.message}`);
      })).address;
  if (!isPrivateAddress(resolved)) {
    throw new Error(`L’imprimante ${address} doit se trouver sur le réseau local.`);
  }

  const timeout = Math.max(1, Number(timeoutMs) || DEFAULT_PRINT_TIMEOUT_MS);
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: resolved, port });
    const fail = (error) => {
      socket.destroy();
      reject(new Error(`Impression vers ${address} impossible : ${error.message}`));
    };
    socket.setTimeout(timeout, () => fail(new Error('délai dépassé')));
    socket.once('error', fail);
    socket.once('connect', () => {
      socket.end(buffer, () => resolve());
    });
  });
}

const RAW_PRINT_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
public class RmRawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool OpenPrinter(string n, out IntPtr h, IntPtr d);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool ClosePrinter(IntPtr h);
  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool StartDocPrinter(IntPtr h, int level, [In] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndDocPrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool StartPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)] static extern bool EndPagePrinter(IntPtr h);
  [DllImport("winspool.drv", SetLastError = true)]
  static extern bool WritePrinter(IntPtr h, byte[] b, int c, out int w);
  public static void Send(string printer, string file) {
    byte[] data = File.ReadAllBytes(file);
    IntPtr h;
    if (!OpenPrinter(printer, out h, IntPtr.Zero)) throw new Exception("Impossible d'ouvrir l'imprimante : " + printer);
    try {
      DOCINFO di = new DOCINFO { pDocName = "RestoMaster OS", pDataType = "RAW" };
      if (!StartDocPrinter(h, 1, di)) throw new Exception("Le spouleur n'a pas accepte le document.");
      try {
        if (!StartPagePrinter(h)) throw new Exception("Impossible de demarrer la page d'impression.");
        int written;
        bool ok = WritePrinter(h, data, data.Length, out written);
        EndPagePrinter(h);
        if (!ok || written != data.Length) throw new Exception("Ecriture incomplete vers le spouleur.");
      } finally { EndDocPrinter(h); }
    } finally { ClosePrinter(h); }
  }
}
"@
[RmRawPrinter]::Send($env:RM_PRINTER, $env:RM_FILE)
`;

async function printWindows({ printerName, bytes }) {
  if (process.platform !== 'win32') {
    throw new Error('L’impression par spouleur Windows n’est disponible que sur Windows.');
  }
  const name = String(printerName || '').trim();
  if (!name) throw new Error('Le nom de l’imprimante Windows est vide.');
  const buffer = Buffer.from(bytes || []);
  if (buffer.length === 0) throw new Error('Le ticket d’impression est vide.');
  if (buffer.length > MAX_PRINT_BYTES) {
    throw new Error('Le ticket d’impression dépasse la taille maximale autorisée (1 Mo).');
  }

  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'restomaster-print-'));
  const dataFile = path.join(dir, 'ticket.bin');
  const scriptFile = path.join(dir, 'print.ps1');
  try {
    await fsp.writeFile(dataFile, buffer);
    await fsp.writeFile(scriptFile, RAW_PRINT_SCRIPT, 'utf8');
    await new Promise((resolve, reject) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptFile],
        {
          windowsHide: true,
          timeout: 15_000,
          env: { ...process.env, RM_PRINTER: name, RM_FILE: dataFile },
        },
        (error, _stdout, stderr) => {
          if (error) {
            const detail = String(stderr || error.message).trim().split(/\r?\n/)[0];
            reject(new Error(`Impression Windows impossible sur « ${name} » : ${detail}`));
          } else {
            resolve();
          }
        }
      );
    });
  } finally {
    fsp.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

// -----------------------------------------------------------------------------
// IPC (toutes les réponses sont { ok, ... } pour garder des messages d'erreur propres)
// -----------------------------------------------------------------------------
function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, payload) => {
    try {
      return { ok: true, ...(await fn(payload)) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

function registerIpc() {
  handle('file:save', async ({ filename, data }) => {
    const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
      defaultPath: path.basename(String(filename || 'export')),
    });
    if (result.canceled || !result.filePath) {
      throw new Error('Enregistrement annulé par l’utilisateur.');
    }
    await fsp.writeFile(result.filePath, Buffer.from(data));
    return { path: result.filePath };
  });

  handle('print:tcp', async (payload) => {
    await printTcp(payload || {});
    return {};
  });

  handle('print:windows', async (payload) => {
    await printWindows(payload || {});
    return {};
  });

  handle('printers:list', async () => {
    const printers = (await mainWindow?.webContents.getPrintersAsync()) ?? [];
    return { printers: printers.map((p) => ({ name: p.name, isDefault: p.isDefault })) };
  });

  handle('link:open', async ({ url }) => {
    const parsed = new URL(String(url));
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Seuls les liens http(s) peuvent être ouverts.');
    }
    await shell.openExternal(parsed.toString());
    return {};
  });

  handle('clipboard:write', async ({ text }) => {
    clipboard.writeText(String(text ?? ''));
    return {};
  });

  handle('screen:keep-awake', async ({ enabled }) => {
    if (enabled && powerBlockerId === null) {
      powerBlockerId = powerSaveBlocker.start('prevent-display-sleep');
    } else if (!enabled && powerBlockerId !== null) {
      powerSaveBlocker.stop(powerBlockerId);
      powerBlockerId = null;
    }
    return {};
  });
}

// -----------------------------------------------------------------------------
// Fenêtre principale
// -----------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'RestoMaster OS',
    backgroundColor: '#020617',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Liens externes : navigateur système uniquement, jamais dans l'application.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = DEV_URL ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });

  if (DEV_URL) {
    void mainWindow.loadURL(DEV_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    if (!DEV_URL) {
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [PRODUCTION_CSP],
          },
        });
      });
    }
    registerIpc();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

// Évite un avertissement si le dossier dist est absent (diagnostic lisible)
if (!DEV_URL && !fs.existsSync(path.join(__dirname, '..', 'dist', 'index.html'))) {
  console.error('[RestoMaster OS] dist/index.html introuvable : lancez « npm run build:electron ».');
}
