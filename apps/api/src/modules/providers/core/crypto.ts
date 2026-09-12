import { encrypt, decrypt } from "../../../lib/crypto.js";
export const encryptCreds = (obj: Record<string,unknown>, key: string) => encrypt(JSON.stringify(obj), key);
export const decryptCreds = (cipher: string, key: string): Record<string,unknown> => JSON.parse(decrypt(cipher, key));
