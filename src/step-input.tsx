import * as React from "react";
import * as Icons from "./feather-icons";
import * as Button from "./button";
import { Input } from "./input";
import { useLongPress } from "./hooks/use-long-press";
import { parseNumberSafe } from "./parse-number-safe";
import { useDebounceCallback } from "./hooks/use-debounce-callback";
import { useResetState } from "./hooks/use-reset-state";

export const StepInput = (props: {
  label: string | null;
  value: number;
  onStepChangeValue: (increment: boolean) => void;
  onChangeValue: (value: number) => void;
}) => {
  const plusHandler = React.useCallback(() => {
    props.onStepChangeValue(true);
  }, [props.onStepChangeValue, props.value]);

  const minusHandler = React.useCallback(() => {
    props.onStepChangeValue(false);
  }, [props.onStepChangeValue, props.value]);

  const plusLongPressProps = useLongPress(() => {
    const interval = setInterval(plusHandler, 100);
    return () => clearInterval(interval);
  });

  const minusLongPressProps = useLongPress(() => {
    const interval = setInterval(minusHandler, 100);
    return () => clearInterval(interval);
  });

  const [localTextValue, setLocalTextValue] = useResetState(
    () => String(props.value),
    [props.value]
  );

  const syncLocalValue = useDebounceCallback(() => {
    const value = parseNumberSafe(localTextValue);
    if (value) {
      props.onChangeValue(value);
    }
  }, 500);

  return (
    <label>
      {props.label ? (
        <div style={{ fontWeight: "bold", marginBottom: 8, textAlign: "left" }}>
          {props.label}
        </div>
      ) : null}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ flexGrow: 1 }}>
          <Input
            value={localTextValue}
            onChange={(ev) => {
              setLocalTextValue(ev.target.value);
              syncLocalValue();
            }}
          />
        </div>
        <div>
          <Button.Tertiary {...plusLongPressProps} onClick={plusHandler} small>
            <Icons.PlusIcon />
          </Button.Tertiary>
        </div>
        <div>
          <Button.Tertiary
            {...minusLongPressProps}
            onClick={minusHandler}
            small
          >
            <Icons.MinusIcon />
          </Button.Tertiary>
        </div>
      </div>
    </label>
  );
};
