const buildHeaders = ({ accessToken }) => {
  return {
    "Content-Type": "application/json",
    Authorization: accessToken ? `Bearer ${accessToken}` : undefined
  };
};

const createNote = ({ id, title, content, createdAt, updatedAt }) => ({
  id,
  title,
  content,
  createdAt: new Date(createdAt).getTime(),
  updatedAt: new Date(updatedAt).getTime()
});

export const loadAll = async ({ accessToken }) => {
  const response = await fetch(`/notes`, {
    headers: buildHeaders({ accessToken })
  });
  const body = await response.json();
  return body.data.notes.map(createNote);
};

export const loadById = async (noteId, { accessToken }) => {
  const response = await fetch(`/notes/${noteId}`, {
    headers: buildHeaders({ accessToken })
  });
  const body = await response.json();
  return createNote(body.data.note);
};

export const create = async ({ title, content }, { accessToken }) => {
  const response = await fetch("/notes", {
    method: "POST",
    body: JSON.stringify({ title, content }),
    headers: buildHeaders({ accessToken })
  });
  const body = await response.json();
  return createNote(body.data.note);
};

export const deleteById = async (noteId, { accessToken }) => {
  await fetch(`/notes/${noteId}`, {
    method: "DELETE",
    headers: buildHeaders({ accessToken })
  });
};

export const update = async (noteId, { title, content }, { accessToken }) => {
  const response = await fetch(`/notes/${noteId}`, {
    method: "PATCH",
    headers: buildHeaders({ accessToken }),
    body: JSON.stringify({ title, content })
  });
  const body = await response.json();
  return createNote(body.data.note);
};
