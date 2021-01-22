import * as React from "react";
import debounce from "lodash/debounce";
import { useStaticRef } from "./use-static-ref";
import { useMutation } from "relay-hooks";
import graphql from "babel-plugin-relay/macro";
import { useNoteTitleAutoSave_noteUpdateTitleMutation } from "./__generated__/useNoteTitleAutoSave_noteUpdateTitleMutation.graphql";

const UseNoteTitleAutoSave_noteUpdateTitleMutation = graphql`
  mutation useNoteTitleAutoSave_noteUpdateTitleMutation(
    $input: NoteUpdateTitleInput!
  ) {
    noteUpdateTitle(input: $input) {
      note {
        id
        title
      }
    }
  }
`;

export const useNoteTitleAutoSave = (noteId: string, initialTitle: string) => {
  const [title, setTitle] = React.useState(initialTitle);
  const previousTitle = React.useRef(title);

  const [mutate] = useMutation<useNoteTitleAutoSave_noteUpdateTitleMutation>(
    UseNoteTitleAutoSave_noteUpdateTitleMutation
  );

  const mutateRef = React.useRef({
    mutate,
    noteId,
  });

  React.useEffect(() => {
    mutateRef.current = {
      mutate,
      noteId,
    };
  });

  const update = useStaticRef(() =>
    debounce(
      (input: { title: string }) =>
        mutateRef.current.mutate({
          variables: {
            input: { ...input, id: mutateRef.current.noteId },
          },
        }),
      500
    )
  );

  React.useEffect(() => {
    if (previousTitle.current !== title) {
      update({
        title,
      });
    }
    previousTitle.current = title;
  }, [title]);

  return [title, setTitle] as const;
};
