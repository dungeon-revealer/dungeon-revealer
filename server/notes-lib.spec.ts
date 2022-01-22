import * as E from "fp-ts/lib/Either";
import type { PubSub } from "@graphql-yoga/subscription";
import * as lib from "./notes-lib";

const createPubSub = (...events: Array<lib.NotesUpdatesPayload>) => {
  return {
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
  } as any as PubSub<lib.NotesPubSubConfig>;
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
test.each([
  [{ lastCreatedAt: 1, lastId: "a" }, { lastCreatedAt: 1, lastId: "a" }, false],
  [{ lastCreatedAt: 1, lastId: "a" }, { lastCreatedAt: 2, lastId: "a" }, true],
  [{ lastCreatedAt: 2, lastId: "a" }, { lastCreatedAt: 1, lastId: "a" }, false],
  [{ lastCreatedAt: 1, lastId: "b" }, { lastCreatedAt: 1, lastId: "a" }, true],
])("isAfterCursor(%o, %o) = %s", (a, b, expectedValue) => {
  expect(lib.isAfterCursor(a, b)).toEqual(expectedValue);
});

const createNoopCursor = () => ({ lastId: "a", lastCreatedAt: 0 });

describe("subscribeToNotesUpdates", () => {
  test("cannot setup if unauthenticated", async () => {
    const result = await lib
      .subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession(),
        pubSub: createPubSub(),
      })()
      .catch((err) => err);

    expect(result).toMatchInlineSnapshot(`[Error: Unauthenticated access.]`);
  });

  it("can setup if viewer has role 'user'", async () => {
    const result = await lib.subscribeToNotesUpdates({
      mode: "all",
      cursor: createNoopCursor(),
      hasNextPage: false,
    })({
      session: createSession("user"),
      pubSub: createPubSub(),
    })();
    expect(E.isRight(result)).toEqual(true);
  });

  it("can setup if viewer has role 'admin'", async () => {
    const result = await lib.subscribeToNotesUpdates({
      mode: "all",
      cursor: createNoopCursor(),
      hasNextPage: false,
    })({
      session: createSession("admin"),
      pubSub: createPubSub(),
    })();
    expect(E.isRight(result)).toEqual(true);
  });

  describe("NOTE_CHANGE_ACCESS event without entry point filter", () => {
    it("publishes correct event for 'user' role in case the access is changed to 'admin'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          mode: "all",
          removedNoteId: "1",
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes correct event for 'user' role in case the access is changed to 'public'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ACCESS",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: "1",
          mode: "all",
          removedNoteId: null,
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes no event for 'admin' role in case the access is changed to 'public'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ACCESS",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role when access is changed to 'admin'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          createdAt: 1,
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
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes correct event for 'user' role when note is entry point and access is changed to 'public'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ACCESS",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: "1",
          mode: "entrypoint",
          removedNoteId: null,
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes no event for 'user' role when note is no entry point and access is changed to 'admin'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes correct event for 'user' role when note is entry point and access is changed to 'admin'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          mode: "entrypoint",
          removedNoteId: "1",
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes no event for 'admin' role when note is entry pomt and access is changed to 'admin'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ACCESS",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();

      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role when note is entry pomt and access is changed to 'public'", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ACCESS",
          access: "public",
          noteId: "1",
          createdAt: 1,
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
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role for public note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role for admin note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role for admin note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role for public note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role for public note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role for admin note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role for admin note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          createdAt: 1,
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
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          mode: "entrypoint",
          removedNoteId: "1",
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes event for 'user' role for public note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: "1",
          mode: "entrypoint",
          removedNoteId: null,
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes no event for 'user' role for admin note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role for admin note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes event for 'admin' role for public note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          mode: "entrypoint",
          removedNoteId: "1",
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes event for 'admin' role for public note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: "1",
          mode: "entrypoint",
          removedNoteId: null,
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes event for 'admin' role for admin note when entry point is removed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          mode: "entrypoint",
          removedNoteId: "1",
          updatedNoteId: null,
        },
      ]);
    });
    it("publishes event for 'admin' role for admin note when entry point is added", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_ENTRY_POINT",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: "1",
          mode: "entrypoint",
          removedNoteId: null,
          updatedNoteId: null,
        },
      ]);
    });
  });
  describe("NOTE_CHANGE_TITLE event without entry point filter", () => {
    it("publishes event for 'user' role in case public note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          mode: "all",
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
    it("publishes no event for 'user' role in case admin note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes event for 'admin' role in case public note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          mode: "all",
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
    it("publishes event for 'admin' role in case admin note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "all",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          mode: "all",
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
  });
  describe("NOTE_CHANGE_TITLE event with entry point filter", () => {
    it("publishes event for 'user' role in case public entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          mode: "entrypoint",
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
    it("publishes no event for 'user' role in case admin entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role in case public non entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'user' role in case admin non entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("user"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes no event for 'admin' role in case public non entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });

    it("publishes event for 'admin' role in case admin entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          mode: "entrypoint",
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
    it("publishes no event for 'admin' role in case admin non entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "admin",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: false,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([]);
    });
    it("publishes event for 'admin' role in case public entry point note title is changed", async () => {
      const result = await lib.subscribeToNotesUpdates({
        mode: "entrypoint",
        cursor: createNoopCursor(),
        hasNextPage: false,
      })({
        session: createSession("admin"),
        pubSub: createPubSub({
          type: "NOTE_CHANGE_TITLE",
          access: "public",
          noteId: "1",
          createdAt: 1,
          isEntryPoint: true,
        }),
      })();
      const values = await getAllValues(getRight(result));
      expect(values).toEqual([
        {
          addedNodeId: null,
          mode: "entrypoint",
          removedNoteId: null,
          updatedNoteId: "1",
        },
      ]);
    });
  });
  it("publishes no event for out of range cursor", async () => {
    const result = await lib.subscribeToNotesUpdates({
      mode: "all",
      cursor: {
        lastCreatedAt: 10,
        lastId: "a",
      },
      hasNextPage: true,
    })({
      session: createSession("admin"),
      pubSub: createPubSub({
        type: "NOTE_CHANGE_TITLE",
        access: "public",
        noteId: "a",
        createdAt: 1,
        isEntryPoint: true,
      }),
    })();
    const values = await getAllValues(getRight(result));
    expect(values).toEqual([]);
  });
  it("publishes event for in range cursor", async () => {
    const result = await lib.subscribeToNotesUpdates({
      mode: "all",
      cursor: {
        lastCreatedAt: 10,
        lastId: "a",
      },
      hasNextPage: false,
    })({
      session: createSession("admin"),
      pubSub: createPubSub({
        type: "NOTE_CHANGE_TITLE",
        access: "public",
        noteId: "a",
        createdAt: 10,
        isEntryPoint: true,
      }),
    })();
    const values = await getAllValues(getRight(result));
    expect(values).toEqual([
      {
        addedNodeId: null,
        mode: "all",
        removedNoteId: null,
        updatedNoteId: "a",
      },
    ]);
  });
});
