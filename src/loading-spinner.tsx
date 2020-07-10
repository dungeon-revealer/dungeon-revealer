import * as React from "react";

// generated with https://loading.io/
export const LoadingSpinner: React.FC<{
  state?: "notStarted" | "inProgress" | "finished";
}> = (props) => {
  let repeatCount = "0";
  if (props.state === "inProgress") {
    repeatCount = "indefinite";
  } else if (props.state === "finished") {
    repeatCount = "1";
  }

  const ref1 = React.useRef<SVGElement | null>(null);
  const ref2 = React.useRef<SVGElement | null>(null);

  React.useEffect(() => {
    if (props.state === "inProgress") {
      ref1.current?.beginElement();
      ref2.current?.beginElement();
    }
  }, [props.state]);

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
        transform="rotate(360 50 50)"
      >
        {props.state === "notStarted" ? null : (
          <animateTransform
            ref={ref1}
            attributeName="transform"
            type="rotate"
            dur="2.857142857142857s"
            repeatCount={repeatCount}
            fill="freeze"
            from="360 50 50"
            to="0 50 50"
          />
        )}
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
        transform="rotate(-360 50 50)"
      >
        {props.state === "notStarted" ? null : (
          <animateTransform
            ref={ref2}
            attributeName="transform"
            type="rotate"
            dur="2.857142857142857s"
            repeatCount={repeatCount}
            fill="freeze"
            from="-360 50 50"
            to="0 50 50"
          />
        )}
      </circle>
    </svg>
  );
};
