const buildHeaders = ({ accessToken }) => {
  return {
    "Content-Type": "application/json",
    Authorization: accessToken ? `Bearer ${accessToken}` : undefined
  };
};

export const loadAll = async ({ accessToken }) => {
  const response = await fetch(`/notes`, {
    headers: buildHeaders({ accessToken })
  });
  const body = await response.json();
  return body.data.notes;
};

export const loadById = async (noteId, { accessToken }) => {
  const response = await fetch(`/notes/${noteId}`, {
    headers: buildHeaders({ accessToken })
  });
  const body = await response.json();
  return body.data.note;
};

export const create = async ({ title, content }, { accessToken }) => {
  const response = await fetch("/notes", {
    method: "POST",
    body: JSON.stringify({ title, content }),
    headers: buildHeaders({ accessToken })
  });
  const body = await response.json();
  return body.data.note;
};

export const deleteById = async (noteId, { accessToken }) => {
  await fetch(`/notes/${noteId}`, {
    method: "DELETE",
    headers: buildHeaders({ accessToken })
  });
};

export const update = async (noteId, { title, content }, { accessToken }) => {
  await fetch(`/notes/${noteId}`, {
    method: "PATCH",
    headers: buildHeaders({ accessToken }),
    body: JSON.stringify({ title, content })
  });
};
