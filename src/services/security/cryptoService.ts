/**
 * RestoMaster OS — Service Cryptographique de Haute Sécurité
 *
 * Implémentation standard basée sur Web Crypto API (SubtleCrypto)
 * Compatible Navigateurs modernes (PWA / Mobile / Desktop) et Node.js 18+
 *
 * 1. Hachage des codes PIN : PBKDF2-SHA256 (100 000 itérations) + Sel 128 bits
 * 2. Chiffrement symétrique : AES-256-GCM (Chiffrement au niveau champ / E2EE)
 */

function bufToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Compare deux chaînes hexadécimales en temps constant pour prévenir les attaques temporelles
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Hache un code PIN avec PBKDF2-SHA256 et un sel unique (100 000 itérations)
 * Zéro stockage en clair : le résultat est une empreinte irréversible.
 */
export async function hashPin(
  pin: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API non disponible dans cet environnement.');
  }

  // 1. Sel unique de 128 bits (16 octets)
  let saltBytes: Uint8Array;
  if (existingSalt) {
    saltBytes = hexToBuf(existingSalt);
  } else {
    saltBytes = new Uint8Array(16);
    cryptoObj.getRandomValues(saltBytes as unknown as Uint8Array<ArrayBuffer>);
  }
  const salt = bufToHex(saltBytes.buffer as ArrayBuffer);

  // 2. Importation de la clé brute du PIN
  const encoder = new TextEncoder();
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // 3. Dérivation PBKDF2 (100 000 itérations, 256 bits = 32 octets)
  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hash = bufToHex(derivedBits);
  return { hash, salt };
}

/**
 * Vérifie la correspondance d'un code PIN avec un hash PBKDF2 stocké
 */
export async function verifyPin(
  pin: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  try {
    const { hash } = await hashPin(pin, storedSalt);
    return constantTimeEqual(hash, storedHash);
  } catch {
    return false;
  }
}

/**
 * Dérive une clé cryptographique AES-256-GCM à partir d'un mot de passe / passphrase
 */
async function deriveAesKey(
  passphrase: string,
  saltBytes: Uint8Array
): Promise<CryptoKey> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  const encoder = new TextEncoder();
  const baseKey = await cryptoObj.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Chiffre une chaîne de données confidentielle avec AES-256-GCM
 * Format produit : `enc:v1:<salt_hex>:<iv_hex>:<ciphertext_hex>`
 */
export async function encryptSensitiveField(
  plaintext: string,
  secretKey: string
): Promise<string> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  const encoder = new TextEncoder();

  // Sel 16 octets + IV 12 octets (96 bits standard GCM)
  const saltBytes = new Uint8Array(16);
  cryptoObj.getRandomValues(saltBytes as unknown as Uint8Array<ArrayBuffer>);

  const ivBytes = new Uint8Array(12);
  cryptoObj.getRandomValues(ivBytes as unknown as Uint8Array<ArrayBuffer>);

  const aesKey = await deriveAesKey(secretKey, saltBytes);
  const cipherBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource },
    aesKey,
    encoder.encode(plaintext)
  );

  return `enc:v1:${bufToHex(saltBytes.buffer as ArrayBuffer)}:${bufToHex(ivBytes.buffer as ArrayBuffer)}:${bufToHex(cipherBuffer as ArrayBuffer)}`;
}

/**
 * Déchiffre une chaîne chiffrée avec AES-256-GCM
 */
export async function decryptSensitiveField(
  encryptedString: string,
  secretKey: string
): Promise<string> {
  if (!encryptedString.startsWith('enc:v1:')) {
    // Si la donnée n'est pas chiffrée, renvoyer telle quelle
    return encryptedString;
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 5) {
    throw new Error('Format de payload chiffré invalide.');
  }

  const [, , saltHex, ivHex, cipherHex] = parts;
  const saltBytes = hexToBuf(saltHex);
  const ivBytes = hexToBuf(ivHex);
  const cipherBytes = hexToBuf(cipherHex);

  const aesKey = await deriveAesKey(secretKey, saltBytes);
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;

  const decryptedBuffer = await cryptoObj.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource },
    aesKey,
    cipherBytes as unknown as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
