import * as React from "react";

// TODO: let checkbox be togglable and update markdown note to reflect it
export const TaskCheckbox = (props: {
  label: string;
  isChecked: boolean;
  isReadOnly: boolean;
}) => (
  <input
    type="checkbox"
    name={props.label}
    checked={props.isChecked}
    readOnly={props.isReadOnly}
  />
);
