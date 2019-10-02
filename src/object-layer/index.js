import React from "react";

export const ObjectLayer = React.forwardRef(
  ({ defs, children, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        {...props}
        style={{
          backfaceVisibility: "hidden",
          position: "absolute",
          overflow: "visible"
        }}
      >
        {defs ? <defs>{defs}</defs> : null}
        {children}
      </svg>
    );
  }
);
