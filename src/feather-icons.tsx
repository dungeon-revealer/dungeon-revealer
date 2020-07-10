//
// All icons are extracted from https://feather.netlify.com/
//
import React from "react";
import styled from "@emotion/styled/macro";

export const Label = styled.div`
  font-size: 10px;
  font-weight: bold;
  color: ${(p) => p.color || "inherit"};
`;

export const DropletIcon: React.FC<
  React.SVGProps<SVGSVGElement> & {
    filled?: boolean;
  }
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

export const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
);

export const Link: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <path d="M15 7h3a5 5 0 015 5 5 5 0 01-5 5h-3m-6 0H6a5 5 0 01-5-5 5 5 0 015-5h3M8 12h8" />
  </svg>
);

export const Maximize: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

export const Share: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <circle cx={18} cy={5} r={3} />
    <circle cx={6} cy={12} r={3} />
    <circle cx={18} cy={19} r={3} />
    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
  </svg>
);

export const BoldIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6zM6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
  </svg>
);

export const ItalicIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <path d="M19 4h-9M14 20H5M15 4L9 20" />
  </svg>
);

export const ImageIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <circle cx={8.5} cy={8.5} r={1.5} />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

export const ListIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

export const ClipboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x={8} y={2} width={8} height={4} rx={1} ry={1} />
  </svg>
);

export const UsersIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx={9} cy={7} r={4} />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

export const MessageCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  </svg>
);

export const SettingsIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <circle cx={12} cy={12} r={3} />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

// replace this with https://github.com/feathericons/feather/pull/918 once merged
export const DiceIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  fill = "currentColor",
  ...props
}) => (
  <svg viewBox="0 0 24 24" fill="none" height={30} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M1 3.538A2.538 2.538 0 013.538 1h16.924A2.538 2.538 0 0123 3.538v16.924A2.538 2.538 0 0120.462 23H3.538A2.538 2.538 0 011 20.462V3.538zm2.538-.846a.846.846 0 00-.846.846v16.924c0 .467.38.846.846.846h16.924a.846.846 0 00.846-.846V3.538a.846.846 0 00-.846-.846H3.538z"
      fill={fill}
    />
    <path
      d="M9.25 7.417a1.833 1.833 0 11-3.667 0 1.833 1.833 0 013.667 0zM13.833 12a1.833 1.833 0 11-3.666 0 1.833 1.833 0 013.666 0zM9.25 16.583a1.833 1.833 0 11-3.667 0 1.833 1.833 0 013.667 0zM18.417 7.417a1.833 1.833 0 11-3.667 0 1.833 1.833 0 013.667 0zM18.417 16.583a1.833 1.833 0 11-3.667 0 1.833 1.833 0 013.667 0z"
      fill={fill}
    />
  </svg>
);

export const InfoIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <path d="M12 16v-4M12 8h.01" />{" "}
  </svg>
);

export const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <path d="M21 21l-4.35-4.35" />
  </svg>
);
