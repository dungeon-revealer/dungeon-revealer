import * as React from "react";
import { createPlugin, useInputContext, Row, Label } from "leva/plugin";
import { Box, Button, HStack } from "@chakra-ui/react";

const normalize = (opts: { value: string | null }) => opts;
const sanitize = (value: string): string => value;

const TokenImageReference = () => {
  const { displayValue, setValue } = useInputContext<any>();

  return (
    <>
      <Row input>
        <Label>Image</Label>

        <HStack alignItems="center" spacing={1}>
          {displayValue ? (
            <>
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
                  alert("TODO: implement this :)");
                }}
              >
                Change
              </Button>
            </>
          ) : (
            <Button
              size="xs"
              onClick={() => {
                alert("TODO: implement this :)");
              }}
            >
              Add
            </Button>
          )}
        </HStack>
      </Row>
    </>
  );
};

export const levaPluginTokenImage = createPlugin({
  normalize,
  sanitize,
  component: TokenImageReference,
});
