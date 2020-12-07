export const parseNumberSafe = (input: string): number | null => {
  const id = parseFloat(input);
  if (Number.isNaN(id)) {
    return null;
  }
  return id;
};
