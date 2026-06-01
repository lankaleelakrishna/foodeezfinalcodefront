import CryptoJS from 'crypto-js';

export function encryptPassword(password: string): string {
  const keyHex = process.env.NEXT_PUBLIC_PASSWORD_ENCRYPTION_KEY ?? '';
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(password, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ivBase64 = iv.toString(CryptoJS.enc.Base64);
  const cipherBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
  return `${ivBase64}:${cipherBase64}`;
}
