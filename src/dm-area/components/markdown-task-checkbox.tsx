import * as React from "react";

export const TaskCheckbox: React.FC<{
  label: string;
  isChecked: boolean;
  isReadOnly: boolean;
  onCheckboxChange: any;
}> = ({ label, isChecked, isReadOnly, onCheckboxChange }) => (
  <input
    type="checkbox"
    name={label}
    checked={isChecked}
    readOnly={isReadOnly}
    onChange={onCheckboxChange}
  />
);
