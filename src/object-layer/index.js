import React from "react";

export const ObjectLayer = React.forwardRef(({ defs, children }, ref) => {
  return (
    <svg
      ref={ref}
      style={{
        pointerEvents: "none",
        backfaceVisibility: "hidden",
        position: "absolute",
        overflow: "visible"
      }}
    >
      {defs ? <defs>{defs}</defs> : null}
      {children}
    </svg>
  );
});
