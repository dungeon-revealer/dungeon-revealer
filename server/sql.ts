export const whereAnd = (...args: Array<String | null>) => {
  const conditions = args.filter((value) => value !== null).join(" AND ");
  return conditions.length ? "WHERE " + conditions : "";
};
