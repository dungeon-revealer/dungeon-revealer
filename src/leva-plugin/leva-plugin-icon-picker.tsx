import * as React from "react";
import {
  createPlugin,
  useInputContext,
  Components as LevaComponents,
  LevaInputProps,
} from "leva/plugin";
import { HStack } from "@chakra-ui/layout";
import styled from "@emotion/styled/macro";

const { Row, Label } = LevaComponents;

type Configuration<TValue extends string> = {
  value: TValue;
  options: Array<{ value: TValue; icon: React.ReactElement; label: string }>;
};

const ShapeButton = styled.button<{ isActive: boolean }>`
  border: none;
  cursor: pointer;
  background-color: transparent;
  color: ${(p) => (p.isActive ? "rgba(0, 0, 0, 1)" : "hsl(211, 27%, 70%)")};
  display: flex;
  align-items: flex-end;

  > svg {
    margin-right: 8px;
    stroke: ${(p) => (p.isActive ? "rgba(0, 0, 0, 1)" : "hsl(211, 27%, 70%)")};
  }
`;

const IconPicker = () => {
  const { displayValue, label, onUpdate, options } =
    useInputContext<Configuration<string> & LevaInputProps<string>>();
  return (
    <Row input>
      <Label>{label}</Label>
      <HStack>
        {options.map((option) => (
          <ShapeButton
            key={option.value}
            isActive={option.value === displayValue}
            onClick={() => onUpdate(option.value)}
          >
            {option.icon}
            <span>{option.label}</span>
          </ShapeButton>
        ))}
      </HStack>
    </Row>
  );
};

const normalize = <TValue extends string>(input: Configuration<TValue>) => ({
  value: input.value,
  options: input.options,
});

export const levaPluginIconPicker = createPlugin({
  normalize,
  component: IconPicker,
});
