import * as React from "react";

export const CellMeasureContext = React.createContext(() => {});
export const useCellMeasure = () => React.useContext(CellMeasureContext);
