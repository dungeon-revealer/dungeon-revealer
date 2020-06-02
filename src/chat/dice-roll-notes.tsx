import * as React from "react";
import { useSpring, animated } from "react-spring";
import { useDrag } from "react-use-gesture";
import styled from "@emotion/styled/macro";
import MonacoEditor from "react-monaco-editor";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
import throttle from "lodash/throttle";
import * as t from "io-ts";
import * as E from "fp-ts/lib/Either";
import { PathReporter } from "io-ts/lib/PathReporter";
import { pipe } from "fp-ts/lib/pipeable";
import { flow } from "fp-ts/lib/function";

import * as Icon from "../feather-icons";
import * as Button from "../button";
import { HtmlContainer } from "../dm-area/components/html-container";
import createPersistedState from "use-persisted-state";
import debounce from "lodash/debounce";
import { useStaticRef } from "../hooks/use-static-ref";

const Window = styled(animated.div)`
  position: relative;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
  background: white;
  z-index: 10000;
  position: absolute;
`;

const WindowHeader = styled.div`
  display: flex;
  padding: 8px 12px;
  border-bottom: 1px solid lightgray;
  cursor: grab;
  align-items: center;
`;

const WindowBody = styled(animated.div)`
  height: 400px;
  width: 100%;
`;

const WindowContent = styled.div`
  overflow-y: scroll;
  height: 100%;
  width: 100%;
  padding: 12px;
  padding-top: 8px;
`;

const WindowsResizeHandle = styled.button`
  all: unset;
  position: absolute;
  bottom: 0;
  right: 0;
  cursor: nwse-resize;
  height: 15px;
  width: 15px;
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

<ChatMessage
  templateId="attackTemplate"
  var-weapon="Handaxe"
  var-attackRollFormula="[1d20 + 5]"
  var-damageRollFormula="[1d6 + 6]"
>
  Attack with Handaxe
</ChatMessage>

<ChatMessage
  templateId="attackTemplate"
  var-weapon="Axe"
  var-attackRollFormula="[1d20 + 5]"
  var-damageRollFormula="[1d4 + 4]"
>
  Attack with Dagger
</ChatMessage>
`;

const usePersitedDiceNotesValue = createPersistedState("peristedDiceNotes");

const DiceRollWindowPosition = t.type(
  {
    x: t.number,
    y: t.number,
    width: t.number,
    height: t.number,
  },
  "DiceRollWindowPosition"
);

type DiceRollWindowPosition = t.TypeOf<typeof DiceRollWindowPosition>;

const validateDiceRollWindowPositionIsWithinWindowBoundaries = (
  input: DiceRollWindowPosition
): E.Either<Error, DiceRollWindowPosition> => {
  if (
    input.x + input.width / 2 >= window.innerWidth ||
    input.x - input.width / 2 <= 0
  ) {
    return E.left(new Error("Out of window bounds."));
  }

  if (input.y <= 0) return E.left(new Error("Out of window bounds."));
  if (input.y + 10 >= window.innerHeight)
    return E.left(new Error("Out of window bounds."));

  return E.right(input);
};

const readValueFromLocalStorage = (key: string) =>
  E.tryCatch(() => window.localStorage.getItem(key), E.toError);

const writeValueToLocalStorage = (key: string, value: string) =>
  E.tryCatch(() => window.localStorage.setItem(key, value), E.toError);

const mapLocalStorageValue = (value: string | null): E.Either<Error, string> =>
  value === null ? E.left(new Error("Missing value.")) : E.right(value);

export const formatDecodeError = (errors: t.Errors) => {
  const lines = PathReporter.report(E.left(errors));
  return new Error(
    "Invalid schema. \n" + lines.map((line) => `- ${line}`).join("\n")
  );
};

export const mapDefaultPosition = () =>
  DiceRollWindowPosition.encode({
    x: window.innerWidth - 400 - 500 - 4,
    y: window.innerHeight - 500 - 4,
    width: 500,
    height: 400,
  });

const getDiceRollNotesPosition = (): DiceRollWindowPosition =>
  pipe(
    readValueFromLocalStorage("notes.diceRollNotes.position"),
    E.chain(mapLocalStorageValue),
    E.chain((value) => E.parseJSON(value, E.toError)),
    E.chain(flow(DiceRollWindowPosition.decode, E.mapLeft(formatDecodeError))),
    E.chain(validateDiceRollWindowPositionIsWithinWindowBoundaries),
    E.fold(mapDefaultPosition, (value) => value)
  );

const storeDiceRollNotesPosition = (position: DiceRollWindowPosition): void =>
  pipe(
    E.stringifyJSON(position, E.toError),
    E.chain((value) =>
      writeValueToLocalStorage("notes.diceRollNotes.position", value)
    ),
    E.fold(
      () => undefined,
      () => undefined
    )
  );

export const DiceRollNotes: React.FC<{ close: () => void }> = ({ close }) => {
  const [mode, setMode] = React.useState<"read" | "write">("read");
  const editorRef = React.useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(
    null
  );
  const [content, _setContent] = usePersitedDiceNotesValue(INITIAL_CONTENT);

  const setContent = useStaticRef(() => debounce(_setContent, 200));

  const [props, set] = useSpring(getDiceRollNotesPosition);

  React.useEffect(() => {
    const listener = throttle(() => {
      let x = props.x.get();
      let y = props.y.get();
      let width = props.width.get();
      let height = props.height.get();

      if (x >= window.innerWidth - width / 2) {
        x = Math.max(window.innerWidth - props.width.get(), 0);
      }
      if (x <= 0) {
        x = 0;
      }
      if (y >= window.innerHeight - height / 2) {
        y = window.innerHeight - height / 2;
      }
      if (y <= 0) {
        y = 0;
      }
      set({
        x,
        y,
        width,
        height,
        immediate: true,
      });
    }, 200);

    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, []);

  const bind = useDrag(
    ({ movement: [mx, my], down }) => {
      // Here we ensure that the modal is not accidentially moved to some location where it is not accessible anymore.
      set({
        x: Math.max(0, Math.min(mx, window.innerWidth - props.width.get())),
        y: Math.max(
          0,
          Math.min(my, window.innerHeight - props.height.get() / 2)
        ),
        immediate: true,
      });
      if (down === false) {
        editorRef.current?.layout();
        storeDiceRollNotesPosition({
          x: props.x.get(),
          y: props.y.get(),
          width: props.width.get(),
          height: props.height.get(),
        });
      }
    },
    {
      initial: () => [props.x.get(), props.y.get()],
    }
  );

  const dimensionDragBind = useDrag(
    ({ movement: [mx, my], down }) => {
      set({
        width: mx,
        height: my,
        immediate: true,
      });
      if (down === false) {
        editorRef.current?.layout();
        storeDiceRollNotesPosition({
          x: props.x.get(),
          y: props.y.get(),
          width: props.width.get(),
          height: props.height.get(),
        });
      }
    },
    {
      initial: () => [props.width.get(), props.height.get()],
    }
  );

  return (
    <Window
      onContextMenu={(ev) => {
        ev.stopPropagation();
      }}
      style={{
        left: props.x,
        top: props.y,
        width: props.width,
      }}
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
      <WindowBody
        style={{
          height: props.height,
        }}
      >
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
            editorDidMount={(editor) => {
              editorRef.current = editor;
            }}
          />
        ) : mode === "read" ? (
          <WindowContent>
            <HtmlContainer markdown={content} />
          </WindowContent>
        ) : null}
      </WindowBody>
      <WindowsResizeHandle {...dimensionDragBind()} />
    </Window>
  );
};
