import styled from "@emotion/styled/macro";

export const Input = styled.input`
  border: none;
  box-shadow: rgba(22, 23, 26, 0.15) 0px 0px 5px;

  width: 100%;

  padding-top: 12px;
  padding-bottom: 12px;
  padding-left: 12px;
  padding-right: 12px;

  font-size: 20px;

  border-radius: 8px;

  ::placeholder {
    color: #b3bbc3;
  }

  outline: none;

  &:focus,
  &:hover {
    box-shadow: rgba(22, 23, 26, 0.3) 0px 0px 5px;
  }
`;
