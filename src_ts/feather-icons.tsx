//
// All icons are extracted from https://feather.netlify.com/
//
import React from "react";
import styled from "@emotion/styled/macro";

export const Label = styled.div`
  font-size: 10px;
  font-weight: bold;
  color: ${p => p.color || "inherit"};
`;

export const DropletIcon: React.FC<
  React.SVGProps<SVGSVGElement> & { filled?: boolean }
> = ({ fill = "currentColor", filled, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? fill : "none"}
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

export const MoveIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
  </svg>
);

export const CropIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15" />
    <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15" />
  </svg>
);

export const PenIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586" />
    <circle cx={11} cy={11} r={2} />
  </svg>
);

export const EyeIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx={12} cy={12} r={3} />
  </svg>
);

export const EyeOffIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
  </svg>
);

export const MapIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" />
  </svg>
);

export const SendIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

export const RadioIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <circle cx={12} cy={12} r={2} />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
  </svg>
);

export const PauseIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <circle cx={12} cy={12} r={10} />
    <path d="M10 15V9M14 15V9" />
  </svg>
);

export const CrosshairIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <circle cx={12} cy={12} r={10} />
    <path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" />
  </svg>
);

export const CircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <circle cx={12} cy={12} r={10} />
  </svg>
);

export const SquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
  </svg>
);

export const Compass: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <circle cx={12} cy={12} r={10} />
    <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
  </svg>
);

export const ZoomOut: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <circle cx={11} cy={11} r={8} />
    <path d="M21 21l-4.35-4.35M8 11h6" />
  </svg>
);

export const ZoomIn: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <circle cx={11} cy={11} r={8} />
    <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
  </svg>
);

export const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const Inbox: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
  </svg>
);

export const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const CheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

export const GridIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
  </svg>
);

export const MinusIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M5 12h14" />
  </svg>
);

export const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const ChevronUpIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M18 15l-6-6-6 6" />
  </svg>
);

export const ChevronRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export const ChevronLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const TargetIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <circle cx={12} cy={12} r={10} />
    <circle cx={12} cy={12} r={6} />
    <circle cx={12} cy={12} r={2} />
  </svg>
);

export const LockIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

export const UnlockIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
    <path d="M7 11V7a5 5 0 019.9-1" />
  </svg>
);

export const BookOpen: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={fill}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    height={30}
    {...props}
  >
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);
