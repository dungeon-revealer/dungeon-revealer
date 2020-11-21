import * as React from "react";
import styled from "@emotion/styled/macro";
import MonacoEditor from "react-monaco-editor";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import * as Icon from "../feather-icons";
import { HtmlContainer } from "../dm-area/components/html-container";
import debounce from "lodash/debounce";
import { useStaticRef } from "../hooks/use-static-ref";
import { DraggableWindow } from "../draggable-window";
import { usePersistedState } from "../hooks/use-persisted-state";

const WindowContent = styled.div`
  overflow-y: scroll;
  height: 100%;
  width: 100%;
  padding: 12px;
  padding-top: 8px;
`;

const INITIAL_CONTENT = `You can roll dice by typing in the dice notation in the Chat:
<ChatMacro message="[1d20 + 5]">
  **[1d20 + 5]**
</ChatMacro>

The formula a dice roll must be surrounded by square brackets.

You can also simply click the dice roll text above. It is a macro that will trigger the dice roll in the chat.

Macros can can contain text and dice rolls. Click the edit button on the top right to for learning how to write your own macros.
You can simply edit this text and add macros that suit your game. They will be stored so you can access them every time you are using dungeon-revealer!

Here are some more examples:

<ChatMacro message="Magic Missle [(1d4 + 1) * 3]">Magic Missle</ChatMacro> 
 <ChatMacro message="Magic Missle [(1d4 + 1) * 4]">2nd level</ChatMacro> 
 <ChatMacro message="Magic Missle [(1d4 + 1) * 5]">3rd level</ChatMacro>

<ChatMacro message="Roll Initiative [1d20 + 5]">Roll Initiative</ChatMacro>

<ChatMacro message="Climb [1d20 + 5][1d20 + 5][1d20 + 5]">Skill Check (DSA)</ChatMacro>

<ChatMacro message="Attack Roll [1d20 + 5] with Sword does [1d8] slasing damage">Attack with sword</ChatMacro>

<ChatMacro message="Stab the unarmed from behind!">Motivate players</ChatMacro>

It is also possible to declare re-usable templates.

<Template id="attackTemplate">
  <Box>
    <BoxRow>
      **<span style="color:red">Attack with {{weapon}}</span>**
    </BoxRow>
    <BoxRow>
      <BoxColumn>
        Attack Roll
      </BoxColumn>
      <BoxColumn>
        {{attackRollFormula}}
      </BoxColumn>
    </BoxRow>
    <BoxRow>
      <BoxColumn>
        Damage
      </BoxColumn>
      <BoxColumn>
        {{damageRollFormula}}
      </BoxColumn>
    </BoxRow>
  </Box>
</Template>

<ChatMacro
  templateId="attackTemplate"
  var-weapon="Handaxe"
  var-attackRollFormula="[1d20 + 5]"
  var-damageRollFormula="[1d6 + 6]"
>
  Attack with Handaxe
</ChatMacro>

<ChatMacro
  templateId="attackTemplate"
  var-weapon="Axe"
  var-attackRollFormula="[1d20 + 5]"
  var-damageRollFormula="[1d4 + 4]"
>
  Attack with Dagger
</ChatMacro>
`;

const usePersitedDiceNotesValue = () =>
  usePersistedState<string>("peristedDiceNotes", {
    encode: (value) => JSON.stringify(value),
    decode: (value) => {
      try {
        if (typeof value === "string") {
          const parsedValue = JSON.parse(value);
          if (typeof parsedValue === "string") {
            return parsedValue;
          }
        }
      } catch (e) {}
      return INITIAL_CONTENT;
    },
  });

export const DiceRollNotes: React.FC<{ close: () => void }> = ({ close }) => {
  const [mode, setMode] = React.useState<"read" | "write">("read");
  const editorRef = React.useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null
  );
  const [content, _setContent] = usePersitedDiceNotesValue();
  const setContent = useStaticRef(() => debounce(_setContent, 200));

  return (
    <DraggableWindow
      headerContent={
        <>
          <div style={{ fontWeight: "bold" }}>Dice Roll Notes</div>
        </>
      }
      options={[
        {
          onClick: () =>
            setMode((mode) => (mode === "read" ? "write" : "read")),
          title: mode === "read" ? "Edit" : "Save",
          //TODO: Make types more strict
          Icon:
            mode === "read" ? (Icon.EditIcon as any) : (Icon.SaveIcon as any),
        },
      ]}
      bodyContent={
        mode === "write" ? (
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
            editorDidMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        ) : mode === "read" ? (
          <WindowContent>
            <HtmlContainer markdown={content} />
          </WindowContent>
        ) : null
      }
      style={{
        top: window.innerHeight / 2 - window.innerHeight / 4,
        left: window.innerWidth / 2 - 500 / 2,
      }}
      close={close}
      onKeyDown={(ev) => {
        ev.stopPropagation();
        if (ev.key !== "Escape") return;
        if (mode === "read") close();
      }}
    />
  );
};
