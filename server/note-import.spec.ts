import { parseNoteData } from "./note-import";

it("correctly parses some input", () => {
  const content = `---
id: dr-wiki-notes
title: Dungeon Revealer Notes
is_entry_point: false
---

foo
---
bar
`;
  const result = parseNoteData(content);

  if (result._tag === "Left") {
    fail(result.left);
    return;
  }

  expect(result.right).toMatchInlineSnapshot(`
    Object {
      "content": "foo
    ---
    bar
    ",
      "id": "dr-wiki-notes",
      "isEntryPoint": false,
      "sanitizedContent": "foo
    bar",
      "title": "Dungeon Revealer Notes",
    }
  `);
});
