import React from "react";
import { AreaMarker } from "./area-marker";

export const AreaMarkerRenderer = React.memo(
  ({ markedAreas, setMarkedAreas }) => {
    return (
      <>
        {markedAreas.map(markedArea => (
          <AreaMarker
            {...markedArea}
            onFinishAnimation={id => {
              setMarkedAreas(markedAreas =>
                markedAreas.filter(area => area.id !== id)
              );
            }}
            key={markedArea.id}
          />
        ))}
      </>
    );
  }
);
