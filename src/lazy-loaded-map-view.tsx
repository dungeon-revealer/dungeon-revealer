import * as React from "react";
import type { MapView } from "./map-view";

export const LazyLoadedMapView = React.lazy<typeof MapView>(() =>
  import("./map-view").then((mod) => ({ default: mod.MapView }))
);
