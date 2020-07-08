import * as React from "react";

// generated with https://loading.io/
export const LoadingSpinner: React.FC<{}> = () => {
  return (
    <svg
      width={200}
      height={200}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid"
      display="block"
      style={{ margin: "auto" }}
    >
      <circle
        cx={50}
        cy={50}
        r={43}
        strokeWidth={3}
        stroke="#044e54"
        strokeDasharray="67.54424205218055 67.54424205218055"
        fill="none"
        strokeLinecap="round"
        transform="rotate(131.9 50 50)"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur="2.857142857142857s"
          repeatCount="indefinite"
          keyTimes="0;1"
          values="0 50 50;360 50 50"
        />
      </circle>
      <circle
        cx={50}
        cy={50}
        r={39}
        strokeWidth={3}
        stroke="#4e6e71"
        strokeDasharray="61.261056745000964 61.261056745000964"
        strokeDashoffset={61.261}
        fill="none"
        strokeLinecap="round"
        transform="rotate(-131.9 50 50)"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur="2.857142857142857s"
          repeatCount="indefinite"
          keyTimes="0;1"
          values="0 50 50;-360 50 50"
        />
      </circle>
    </svg>
  );
};
