import * as React from "react";
import { useSpring, animated } from "react-spring";
import { useDrag } from "react-use-gesture";
import styled from "@emotion/styled";
import MonacoEditor from "react-monaco-editor";
import * as Icon from "../feather-icons";
import * as Button from "../button";
import { HtmlContainer } from "../dm-area/components/html-container";
import createPersistedState from "use-persisted-state";
import debounce from "lodash/debounce";
import { useStaticRef } from "../hooks/use-static-ref";

const Window = styled(animated.div)`
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
  width: 500px;
  background: white;
  z-index: 10000;
  position: absolute;
  bottom: 4px;
  right: 404px;
`;

const WindowHeader = styled.div`
  display: flex;
  padding: 8px 12px;
  border-bottom: 1px solid lightgray;
  cursor: grab;
  align-items: center;
`;

const WindowBody = styled.div`
  height: 400px;
`;

const WindowContent = styled.div`
  overflow-y: scroll;
  height: 100%;
  width: 100%;
  padding: 12px;
  padding-top: 8px;
`;

const INITIAL_CONTENT = `You can roll dice by typing in the dice notation in the Chat:
<ChatMessage message="[1d20 + 5]">
  **[1d20 + 5]**
</ChatMessage>

The formula a dice roll must be surrounded by square brackets.

You can also simply click the dice roll text above. It is a macro that will trigger the dice roll in the chat.

Macros can can contain text and dice rolls. Click the edit button on the top right to for learning how to write your own macros.
You can simply edit this text and add macros that suit your game. They will be stored so you can access them every time you are using dungeon-revealer!

Here are some more examples:

<ChatMessage message="Magic Missle [(1d4 + 1) * 3]">Magic Missle</ChatMessage> 
 <ChatMessage message="Magic Missle [(1d4 + 1) * 4]">2nd level</ChatMessage> 
 <ChatMessage message="Magic Missle [(1d4 + 1) * 5]">3rd level</ChatMessage>

<ChatMessage message="Roll Initiative [1d20 + 5]">Roll Initiative</ChatMessage>

<ChatMessage message="Climb [1d20 + 5][1d20 + 5][1d20 + 5]">Skill Check (DSA)</ChatMessage>

<ChatMessage message="Attack Roll [1d20 + 5] with Sword does [1d8] slasing damage">Attack with sword</ChatMessage>

<ChatMessage message="Stab the unarmed from behind!">Motivate players</ChatMessage>



`;

const usePersitedDiceNotesValue = createPersistedState("peristedDiceNotes");

export const DiceRollNotes: React.FC<{ close: () => void }> = ({ close }) => {
  const [mode, setMode] = React.useState<"read" | "write">("read");
  const [content, _setContent] = usePersitedDiceNotesValue(INITIAL_CONTENT);

  const setContent = useStaticRef(() => debounce(_setContent, 200));

  const [props, set] = useSpring(() => ({
    x: 0,
    y: 0,
  }));

  const bind = useDrag(({ offset: [x, y] }) =>
    set({
      x: x,
      y: y,
      immediate: true,
    })
  );

  return (
    <Window
      onContextMenu={(ev) => {
        ev.stopPropagation();
      }}
      style={props}
    >
      <WindowHeader {...bind()}>
        <div style={{ fontWeight: "bold" }}>Dice Roll Notes</div>
        <div style={{ marginLeft: "auto", marginRight: 4 }}>
          <Button.Tertiary
            small
            iconOnly
            title="Edit"
            onClick={() =>
              setMode((mode) => (mode === "read" ? "write" : "read"))
            }
          >
            <Icon.EditIcon height={16} />
          </Button.Tertiary>
        </div>
        <div style={{ marginRight: 0 }}>
          <Button.Tertiary small iconOnly onClick={close} title="Close">
            <Icon.XIcon height={16} />
          </Button.Tertiary>
        </div>
      </WindowHeader>
      <WindowBody>
        {mode === "write" ? (
          <MonacoEditor
            language="markdown"
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              wordWrap: "on",
              glyphMargin: false,
              folding: false,
              lineDecorationsWidth: 12,
              lineNumbersMinChars: 0,
            }}
            value={content}
            onChange={(value) => setContent(value)}
          />
        ) : mode === "read" ? (
          <WindowContent>
            <HtmlContainer markdown={content} />
          </WindowContent>
        ) : null}
      </WindowBody>
    </Window>
  );
};
