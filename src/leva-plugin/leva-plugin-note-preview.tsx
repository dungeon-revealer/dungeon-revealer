import * as React from "react";
import {
  createPlugin,
  useInputContext,
  Components as LevaComponents,
} from "leva/plugin";
import { HtmlContainer } from "../dm-area/components/html-container";
import { Box, Button, Flex } from "@chakra-ui/react";
import { useNoteWindowActions } from "../dm-area/token-info-aside";

const { Row } = LevaComponents;

type TokenNoteValue = {
  id: string;
  markdown: string;
};

const TokenNote = () => {
  const { displayValue } = useInputContext<{ displayValue: TokenNoteValue }>();
  const actions = useNoteWindowActions();

  return (
    <Row>
      <Box maxHeight={300} overflowY="scroll">
        <HtmlContainer markdown={displayValue.markdown} />
      </Box>
      <Flex justifyContent="flex-end">
        <Button
          size="xs"
          onClick={() => actions.focusOrShowNoteInNewWindow(displayValue.id)}
        >
          Open
        </Button>
      </Flex>
    </Row>
  );
};

const normalize = (input: { value: TokenNoteValue }) => ({
  value: input.value,
});

/**
 * Render token markdown as read-only
 */
export const levaPluginNotePreview = createPlugin({
  normalize,
  component: TokenNote,
});
