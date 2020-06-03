import * as React from "react";
import styled from "@emotion/styled/macro";
import type { chatMessage_message } from "./__generated__/chatMessage_message.graphql";

const StyledDiceRoll = styled.span`
  padding-right: 4px;
`;

const Wrapper = styled.span`
  background: white;
  border-radius: 3px;
  border: 1px solid #d1d1d1;
  padding-left: 4px;
  padding-top: 2px;
  padding-bottom: 2px;
  padding-right: 4px;
`;

const ResultWraper = styled(Wrapper)`
  font-weight: bold;
`;

const EqualSign = styled.span`
  padding-left: 2px;
  padding-top: 2px;
  padding-bottom: 2px;
`;

const colors = {
  fail: "#730505",
  crit: "#247305",
};

const RollResult = styled.span<{ type: "DEFAULT" | "MIN" | "MAX" | unknown }>`
  color: ${(p) =>
    p.type === "MIN" ? colors.fail : p.type === "MAX" ? colors.crit : null};
  font-weight: ${(p) => (p.type !== "DEFAULT" ? "bold" : null)};
`;

export const FormattedDiceRoll: React.FC<{
  diceRoll: Extract<
    chatMessage_message,
    { __typename: "UserChatMessage" }
  >["diceRolls"][number];
}> = ({ diceRoll }) => {
  return (
    <StyledDiceRoll>
      <Wrapper>
        {diceRoll.detail.map((node) => {
          switch (node.__typename) {
            case "DiceRollDiceRollNode":
              return node.rollResults.map((result, index) => (
                <span key={index}>
                  <RollResult type={result.category}>
                    {result.result}
                  </RollResult>{" "}
                  ({result.dice})
                  {index + 1 === node.rollResults.length ? null : " + "}{" "}
                </span>
              ));
            case "%other":
              return null;
            default:
              return node.content + " ";
          }
        })}
      </Wrapper>
      <EqualSign>{" = "}</EqualSign>
      <ResultWraper style={{ fontWeight: "bold" }}>
        {diceRoll.result}
      </ResultWraper>
    </StyledDiceRoll>
  );
};
