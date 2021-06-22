export type MapGridEntity = {
  color: string;
  offsetX: number;
  offsetY: number;
  columnWidth: number;
  columnHeight: number;
};

export type MapTokenEntity = {
  id: string;
  radius: number;
  rotation: number;
  color: string;
  label: string;
  x: number;
  y: number;
  isVisibleForPlayers: boolean;
  isMovableByPlayers: boolean;
  isLocked: boolean;
  reference: null | {
    type: "note";
    id: string;
  };
  tokenImageId: string | null;
};

export type MapEntity = {
  id: string;
  showGridToPlayers: boolean;
  showGrid: boolean;
  grid: null | MapGridEntity;
  tokens: Array<MapTokenEntity>;
};

export type MarkedAreaEntity = {
  id: string;
  x: number;
  y: number;
};
