import * as E from "fp-ts/lib/Either";
import * as lib from "./notes-lib";

const createNotesUpdates = (...events: Array<lib.NotesUpdatesPayload>) => {
  return ({
    publish: () => {},
    subscribe: () => {
      const iterator = {
        next: () => {
          if (events.length) {
            return Promise.resolve({ done: false, value: events.pop()! });
          }
          return Promise.resolve({ done: true, value: undefined });
        },
        [Symbol.asyncIterator]: () => iterator,
      };

      return iterator;
    },
  } as any) as lib.NotesUpdates;
};

const createSession = (
  role: "unauthenticated" | "admin" | "user" = "unauthenticated"
) => ({
  id: "1",
  role,
});

const getRight = <T>(value: E.Either<any, T>): T => {
  if (E.isLeft(value)) {
    throw new Error("Expected right value");
  }
  return value.right;
};

const getAllValues = async <T>(
  asyncIterable: AsyncIterableIterator<T>
): Promise<Array<T>> => {
  const values: Array<T> = [];
  for await (const value of asyncIterable) {
    values.push(value);
  }
  return values;
};

describe("subscribeToNotesUpdates", () => {
  test("cannot setup if unauthenticated", async () => {
    const result = await lib.subscribeToNotesUpdates({ onlyEntryPoints: true })(
      {
        session: createSession(),
        notesUpdates: createNotesUpdates(),
      }
    )();

    expect(E.isLeft(result)).toEqual(true);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_tag": "Left",
        "left": [Error: Unauthenticated access.],
      }
    `);
  });

  it("can setup if viewer has role 'user'", async () => {
    const result = await lib.subscribeToNotesUpdates({ onlyEntryPoints: true })(
      {
        session: createSession("user"),
        notesUpdates: createNotesUpdates(),
      }
    )();
    expect(E.isRight(result)).toEqual(true);
  });

  it("can setup if viewer has role 'admin'", async () => {
    const result = await lib.subscribeToNotesUpdates({ onlyEntryPoints: true })(
      {
        session: createSession("admin"),
        notesUpdates: createNotesUpdates(),
      }
    )();
    expect(E.isRight(result)).toEqual(true);
  });

  describe("NOTE_CHANGE_ACCESS event without entry point filter", () => {
    it("publishes correct event for 'user' role in case the access is changed to 'admin'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          onlyEntryPoints: false,
          removedNoteId: "1",
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes correct event for 'user' role in case the access is changed to 'public'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ACCESS",
          access: "public",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: "1",
          onlyEntryPoints: false,
          removedNoteId: null,
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes no event for 'admin' role in case the access is changed to 'public'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ACCESS",
          access: "public",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role when access is changed to 'admin'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
  });

  describe("NOTE_CHANGE_ACCESS event with entry point filter", () => {
    it("publishes no event for 'user' role when note is no entry point and the role is changed to 'admin'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes correct event for 'user' role when note is entry point and access is changed to 'public'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ACCESS",
          access: "public",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: "1",
          onlyEntryPoints: true,
          removedNoteId: null,
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes no event for 'user' role when note is no entry point and access is changed to 'admin'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes correct event for 'user' role when note is entry point and access is changed to 'admin'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          onlyEntryPoints: true,
          removedNoteId: "1",
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes no event for 'admin' role when note is entry pomt and access is changed to 'admin'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role when note is entry pomt and access is changed to 'public'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ACCESS",
          access: "public",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
  });

  describe("NOTE_CHANGE_ENTRY_POINT event without entry point filter", () => {
    it("publishes no event for 'user' role for public note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role for public note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role for admin note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role for admin note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role for public note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role for public note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role for admin note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role for admin note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
  });
  describe("NOTE_CHANGE_ENTRY_POINT event with entry point filter", () => {
    it("publishes event for 'user' role for public note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          onlyEntryPoints: true,
          removedNoteId: "1",
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes event for 'user' role for public note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: "1",
          onlyEntryPoints: true,
          removedNoteId: null,
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes no event for 'user' role for admin note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role for admin note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes event for 'admin' role for public note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          onlyEntryPoints: true,
          removedNoteId: "1",
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes event for 'admin' role for public note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: "1",
          onlyEntryPoints: true,
          removedNoteId: null,
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes event for 'admin' role for admin note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          onlyEntryPoints: true,
          removedNoteId: "1",
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes event for 'admin' role for admin note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: "1",
          onlyEntryPoints: true,
          removedNoteId: null,
          updatedNoteId: null,
        },
      ]);
    });
  });
  describe("NOTE_CHANGE_TITLE event without entry point filter", () => {
    it("publishes event for 'user' role in case public note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          onlyEntryPoints: false,
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
    it("publishes no event for 'user' role in case admin note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "admin",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes event for 'admin' role in case public note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          onlyEntryPoints: false,
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
    it("publishes event for 'admin' role in case admin note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: false,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "admin",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          onlyEntryPoints: false,
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
  });
  describe("NOTE_CHANGE_TITLE event with entry point filter", () => {
    it("publishes event for 'user' role in case public entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          onlyEntryPoints: true,
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
    it("publishes no event for 'user' role in case admin entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "admin",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role in case public non entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role in case admin non entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("user"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role in case public non entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });

    it("publishes event for 'admin' role in case admin entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          onlyEntryPoints: true,
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
    it("publishes no event for 'admin' role in case admin non entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "admin",
          noteId: "1",
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes event for 'admin' role in case public entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        onlyEntryPoints: true,
      })({
        session: createSession("admin"),
        notesUpdates: createNotesUpdates({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          onlyEntryPoints: true,
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
  });
});
