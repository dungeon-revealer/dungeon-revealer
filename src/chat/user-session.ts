//
// Utility functions for persisting the user data in the local storage
//

export const readUserFromLocalStorage = () => {
  const user = localStorage.getItem("user");
  if (user == null) return null;
  try {
    const record = JSON.parse(user);
    if (!record) return null;
    if (typeof record.id === "string" && typeof record.name === "string") {
      return record as { id: string; name: string };
    }
  } catch (err) {}
  return null;
};

export const writeUserToLocalStorage = (user: { id: string; name: string }) => {
  localStorage.setItem("user", JSON.stringify(user));
};
