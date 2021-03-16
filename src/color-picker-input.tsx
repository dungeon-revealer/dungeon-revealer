import {
  Popover,
  PopoverTrigger,
  Input,
  InputGroup,
  PopoverContent,
  Box,
  InputRightElement,
} from "@chakra-ui/react";
import * as React from "react";
import { RgbaStringColorPicker } from "react-colorful";
import { isColor } from "./color-lib";
import { useResetState } from "./hooks/use-reset-state";

export const ColorPickerInput = (props: {
  size?: string;
  color: string;
  width?: number | string;
  onChange: (color: string) => void;
}) => {
  const [value, setValue] = useResetState(props.color, [props.color]);

  const Picker = RgbaStringColorPicker;
  return (
    <InputGroup size={props.size} width={props.width}>
      <Input
        value={value}
        onChange={(ev) => {
          const value = ev.target.value;
          if (isColor(value)) {
            props.onChange(value);
          }
          setValue(ev.target.value);
        }}
      />
      <InputRightElement
        paddingRight="0"
        width="55px"
        children={
          <>
            <Popover>
              <PopoverTrigger>
                <Box
                  as="button"
                  backgroundColor={value}
                  width="55px"
                  height="100%"
                  borderRightRadius="0.375em"
                  borderLeft="1px solid #E2E8F0"
                />
              </PopoverTrigger>
              <PopoverContent width="max-content" p={2}>
                <div style={{ height: 200, width: 200 }}>
                  <Picker
                    color={value}
                    onChange={(value) => {
                      setValue(value);
                      props.onChange(value);
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </>
        }
      />
    </InputGroup>
  );
};
