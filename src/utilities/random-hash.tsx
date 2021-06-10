const dec2Hex = (dec: number): string => dec.toString(16).padStart(2, "0");

export const randomHash = (len = 20) => {
  const values = new Uint8Array(len / 2);
  window.crypto.getRandomValues(values);
  return Array.from(values, dec2Hex).join("");
};
