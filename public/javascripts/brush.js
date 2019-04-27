define(function() {
  console.log("brush.js starting");

  return function(context, settings) {
    console.log("creating brush");

    if (!context || !settings) {
      throw new Error("Invalid args");
    }

    const brushTypes = ["clear", "fog"];
    let currentBrushType = brushTypes[0];
    const setBrushType = function() {
      console.error("Doesn't exist yet");
    };
    const toggle = function() {
      if (currentBrushType === brushTypes[0]) {
        console.log("shroud brush set");
        currentBrushType = brushTypes[1];
      } else if (currentBrushType === brushTypes[1]) {
        console.log("clear brush set");
        currentBrushType = brushTypes[0];
      } else {
        console.log("nothing: ");
        console.log(currentBrushType);
      }
      context.strokeStyle = getCurrent();
    };
    const getPattern = function(brushType) {
      if (brushType === brushTypes[0]) {
        context.globalCompositeOperation = "destination-out";
        return "rgba(" + settings.fogRGB + "," + settings.fogOpacity + ")";
      } else if (brushType === brushTypes[1]) {
        context.globalCompositeOperation = "source-over";
        return "rgba(" + settings.fogRGB + "," + settings.fogOpacity + ")";
      }
    };
    const getCurrent = function() {
      return getPattern(currentBrushType);
    };

    return {
      brushTypes: brushTypes,
      currentBrushType: currentBrushType,
      setBrushType: setBrushType,
      toggle: toggle,
      getCurrent: getCurrent,
      getPattern: getPattern
    };
  };
});
