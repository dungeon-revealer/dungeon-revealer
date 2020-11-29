export type GridEntity = {
  x: number;
  y: number;
  sideLength: number;
};

export type MapTokenEntity = {
  id: string;
  radius: number;
  color: string;
  label: string;
  x: number;
  y: number;
  isVisibleForPlayers: boolean;
  isMovableByPlayers: boolean;
  isLocked: boolean;
};

export type MapEntity = {
  id: string;
  showGridToPlayers: boolean;
  grid: null | GridEntity;
  gridColor: string;
  tokens: Array<MapTokenEntity>;
};

export type MarkedArea = {
  id: string;
  x: number;
  y: number;
};
