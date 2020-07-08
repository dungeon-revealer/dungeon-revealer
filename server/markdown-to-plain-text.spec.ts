import * as md from "./markdown-to-plain-text";

test("sanitizeBody: strips markdown", () => {
  const input = md.markdownToPlainText(`# Lol`);
  const expected = `Lol`;
  expect(input).toEqual(expected);
});

test("sanitizeBody: strips out breadcrumbs", () => {
  const input = md.markdownToPlainText(`Lol<breadcrumb>test</breadcrumb>`);
  const expected = `Lol`;
  expect(input).toEqual(expected);
});
