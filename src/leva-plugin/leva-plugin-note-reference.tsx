import * as React from "react";
import {
  createPlugin,
  useInputContext,
  Components as LevaComponents,
} from "leva/plugin";
import { Box, Button, HStack } from "@chakra-ui/react";
import { useNoteWindowActions } from "../dm-area/token-info-aside";
import { useShowSelectNoteModal } from "../dm-area/select-note-modal";

const { Row, Label } = LevaComponents;

const NoteReference = () => {
  const { displayValue, setValue } = useInputContext<any>();
  const noteWindowActions = useNoteWindowActions();

  const [reactNode, showSelectNoteModal] = useShowSelectNoteModal();
  return (
    <>
      {reactNode}
      <Row input>
        <Label>Reference</Label>

        <HStack alignItems="center" spacing={1}>
          {displayValue ? (
            <>
              <Box justifySelf="flexStart">Note</Box>
              <Button
                size="xs"
                onClick={() => {
                  setValue(null);
                }}
              >
                Remove
              </Button>
              <Button
                size="xs"
                onClick={() => {
                  noteWindowActions.focusOrShowNoteInNewWindow(displayValue);
                }}
              >
                Edit
              </Button>
            </>
          ) : (
            <Button
              size="xs"
              onClick={() => {
                showSelectNoteModal((noteId) => {
                  setValue(noteId);
                });
              }}
            >
              Link
            </Button>
          )}
        </HStack>
      </Row>
    </>
  );
};

type NoteReferenceIdValue = string | null;

const normalize = (input: { value: NoteReferenceIdValue }) => ({
  value: input.value,
});

export const levaPluginNoteReference = createPlugin({
  normalize,
  component: NoteReference,
});
