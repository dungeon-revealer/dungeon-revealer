import React, { useState } from "react";
import styled from "@emotion/styled/macro";
import { Input } from "./input";
import * as Button from "./button";
import { BackgroundImageContainer } from "./background-image-container";
import { BrandLogoText } from "./brand-logo-text";
import { Modal, ModalDialogSize } from "./dm-area/modal";

const ButtonContainer = styled.div`
  margin-top: 16px;
  display: flex;
`;

const ButtonColumn = styled.div`
  margin-left: auto;
  margin-right: 0;
`;

export const AuthenticationScreen = ({
  onAuthenticate,
  requiredRole = "DM",
  fetch
}) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  return (
    <BackgroundImageContainer>
      <form
        onSubmit={async ev => {
          ev.preventDefault();
          setError(null);
          const result = await fetch("/auth", {
            headers: {
              Authorization: `Bearer ${password}`
            }
          }).then(res => res.json());
          if (result.data.role === requiredRole) {
            onAuthenticate(password);
          } else {
            setError("Invalid Password!");
          }
        }}
      >
        <BrandLogoText />
        <Input
          placeholder="Password"
          value={password}
          onChange={ev => setPassword(ev.target.value)}
        />
        <ButtonContainer>
          <ButtonColumn>
            <Button.Primary type="submit">Log In</Button.Primary>
          </ButtonColumn>
        </ButtonContainer>
      </form>
      {error ? (
        <Modal>
          <Modal.Dialog size={ModalDialogSize.SMALL}>
            <Modal.Header>
              <h3>Invalid Password</h3>
            </Modal.Header>
            <Modal.Body>
              The password you entered is invalid. Please try again.{" "}
              <ButtonContainer>
                <ButtonColumn
                  onClick={() => {
                    setError(null);
                    setPassword(null);
                  }}
                >
                  <Button.Primary>Try again.</Button.Primary>
                </ButtonColumn>
              </ButtonContainer>
            </Modal.Body>
          </Modal.Dialog>
        </Modal>
      ) : null}
    </BackgroundImageContainer>
  );
};
