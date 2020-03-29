import { RawNoteType } from "./note-store-state";
import { Maybe } from "../util";
import { buildUrl } from "../../../public-url";

const buildHeaders = ({ accessToken }: { accessToken: Maybe<string> }) => {
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
};

type HTTPNoteType = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const createNote = ({
  id,
  title,
  content,
  createdAt,
  updatedAt,
}: HTTPNoteType): RawNoteType => ({
  id,
  title,
  content,
  createdAt: new Date(createdAt).getTime(),
  updatedAt: new Date(updatedAt).getTime(),
});

export const loadAll = async ({
  accessToken,
}: {
  accessToken: string | null;
}): Promise<RawNoteType[]> => {
  const response = await fetch(buildUrl("/notes"), {
    headers: buildHeaders({ accessToken }),
  });
  const body = await response.json();
  return body.data.notes.map(createNote);
};

export const loadById = async (
  noteId: string,
  { accessToken }: { accessToken: string | null }
) => {
  const response = await fetch(buildUrl(`/notes/${noteId}`), {
    headers: buildHeaders({ accessToken }),
  });
  const body = await response.json();
  if (body.error)
    return { mode: "NOT_FOUND" as "NOT_FOUND", error: body.error, noteId };
  return {
    mode: "FOUND" as "FOUND",
    note: createNote(body.data.note),
  };
};

export const create = async (
  { title, content }: { title: string; content: string },
  { accessToken }: { accessToken: string | null }
) => {
  const response = await fetch(buildUrl("/notes"), {
    method: "POST",
    body: JSON.stringify({ title, content }),
    headers: buildHeaders({ accessToken }),
  });
  const body = await response.json();
  return createNote(body.data.note);
};

export const deleteById = async (
  noteId: string,
  { accessToken }: { accessToken: string | null }
) => {
  await fetch(buildUrl(`/notes/${noteId}`), {
    method: "DELETE",
    headers: buildHeaders({ accessToken }),
  });
};

export const update = async (
  noteId: string,
  { title, content }: { title: string; content: string },
  { accessToken }: { accessToken: string | null }
) => {
  const response = await fetch(buildUrl(`/notes/${noteId}`), {
    method: "PATCH",
    headers: buildHeaders({ accessToken }),
    body: JSON.stringify({ title, content }),
  });
  const body = await response.json();
  return createNote(body.data.note);
};
