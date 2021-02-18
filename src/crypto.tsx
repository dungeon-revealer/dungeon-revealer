// window.crypto.subtle is undefined on page served via http
const crypto: null | SubtleCrypto = window?.crypto?.subtle ?? null;

const i2hex = (i: number): string => {
  return ("00" + i.toString(16)).slice(-2);
};

const generateHexFromUint8Array = (arr: Uint8Array) =>
  Array.prototype.map.call(arr, i2hex).join("");

const generateSHA256HashNative = async (
  crypto: SubtleCrypto,
  arrayBuffer: ArrayBuffer
) => {
  const buf = await crypto.digest("SHA-256", arrayBuffer);
  return new Uint8Array(buf);
};

const generateSHA256HashFallback = async (arrayBuffer: ArrayBuffer) => {
  // npm install -E -D fast-sha256@1.3.0
  const { hash } = await import("fast-sha256");
  return hash(new Uint8Array(arrayBuffer));
};

export const generateSHA256FileHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const rawHash = await (crypto
    ? generateSHA256HashNative(crypto, arrayBuffer)
    : generateSHA256HashFallback(arrayBuffer));
  return generateHexFromUint8Array(rawHash);
};
