'use strict';

/**
 * Preload Electron : expose une API minimale et typée au renderer
 * (contextIsolation activé, aucun accès direct à Node).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (filename, data) => ipcRenderer.invoke('file:save', { filename, data }),
  printTcp: (host, port, bytes, timeoutMs) =>
    ipcRenderer.invoke('print:tcp', { host, port, bytes, timeoutMs }),
  printWindows: (printerName, bytes) =>
    ipcRenderer.invoke('print:windows', { printerName, bytes }),
  listPrinters: () => ipcRenderer.invoke('printers:list'),
  openLink: (url) => ipcRenderer.invoke('link:open', { url }),
  writeClipboard: (text) => ipcRenderer.invoke('clipboard:write', { text }),
  keepAwake: (enabled) => ipcRenderer.invoke('screen:keep-awake', { enabled }),
});
