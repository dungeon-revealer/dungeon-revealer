var settings = {
  maxWidth: 800,
  maxHeight: 600,
  fogOpacity: 1,
  fogRGB: "0,0,0",
  defaultLineWidth: 15,
  mapImage: '/images/map.png',
  shadowImage: null, // for future feature
};

var width,
    height,
    lineWidth = settings.defaultLineWidth,
    fogOpacity = settings.fogOpacity,
    fogRGB = settings.fogRGB,
    mapImage = settings.mapImage,
    img = new Image(),
    socket = io();

var isDrawing, points = [];
var brush;

function createCanvases() {

  function createCanvas(id, zIndex) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.id = id;
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.zIndex = zIndex;
    zIndex++;

    document.querySelector('#canvasContainer').appendChild(canvas);
  }

  var container = document.createElement("div");
  container.id = "canvasContainer";
  container.style.position = "relative";
  container.style.top = "0";
  container.style.left = "0";
  container.style.margin = "auto";
  //container.style.margin-right = "auto";
  container.style.width = width + 'px';
  container.style.height = height + 'px';

  document.getElementById('map-wrapper').appendChild(container);

  createCanvas('mapCanvas', 1)
  createCanvas('dmCanvas', 2);
};


function midPointBtw(p1, p2) {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2
  };
}

//document.addEventListener('DOMContentLoaded', function(){});
img.onload = function() {
  setUp();
};
img.crossOrigin = 'Anonymous'; // to prevent tainted canvas errors
img.src = mapImage;
function createImageCanvas(img) {
  var imageCanvas = document.createElement("canvas"),
  	  imageContext = imageCanvas.getContext('2d');

  imageCanvas.width = width;
  imageCanvas.height = height;
  imageContext.drawImage(img, 0,0, width, height);

  return imageCanvas;
}
/*
function getImagePattern() {
  return dmContext.createPattern(createImageCanvas(), 'repeat');
}*/
function convertCanvasToImage(canvas) {
	var image = new Image();
	image.src = canvas.toDataURL("image/png");
	return image;
}
function copyCanvas(context, canvasToCopy) {
  context.drawImage(canvasToCopy, 0,0, width, height);
}
function resetBoard(context, brushType) {
  context.save();
  context.fillStyle = brush.getPattern(brushType);
  context.fillRect(0,0,width,height);
  context.restore();
}
function fogBoard(context) {
  resetBoard(context, 'fog');
}
function clearBoard(context) {
  resetBoard(context, 'clear');
}

function getMouseCoordinates(e) {
  var viewportOffset = dmCanvas.getBoundingClientRect(),
      borderTop = parseInt($(dmCanvas).css('border-top-width')),
      borderLeft = parseInt($(dmCanvas).css('border-left-width'));
  return {
    x: e.clientX - viewportOffset.left - borderLeft,
    y: e.clientY - viewportOffset.top - borderTop
  }
}

function stopDrawing() {
  if (isDrawing) {
    createPreview();
  }
  isDrawing = false;
  points.length = 0;
}

function mergeCanvas(bottomCanvas, topCanvas) {
  var mergedCanvas = document.createElement('canvas'),
      mergedContext = mergedCanvas.getContext('2d');

  mergedCanvas.width = width;
  mergedCanvas.height = height;
  //var canvas = createImageCanvas();
  copyCanvas(mergedContext, bottomCanvas);
  copyCanvas(mergedContext, topCanvas);

  return mergedCanvas;
}

function createPlayerMapImage(bottomCanvas, topCanvas) {

  var mergedCanvas = mergeCanvas(bottomCanvas, topCanvas),
      mergedImage = convertCanvasToImage(mergedCanvas);
  mergedImage.id = 'preview';
  document.querySelector('#map-wrapper').appendChild(mergedImage);
}

function getOptimalDimensions(width, height, maxWidth, maxHeight) {
  var widthCompressionRatio,
      heightCompressionRatio,
      bestCompressionRatio,
      d = { width: width, height: height };
  widthCompressionRatio = maxWidth/width;
  heightCompressionRatio = maxHeight/height;
  if (widthCompressionRatio < 1 || heightCompressionRatio < 1) {
    if (widthCompressionRatio < heightCompressionRatio) {
      bestCompressionRatio = widthCompressionRatio;
    } else {
      bestCompressionRatio = heightCompressionRatio;
    }
  	d.width = parseInt(d.width * bestCompressionRatio);
		d.height = parseInt(d.height * bestCompressionRatio);
  }
	return d;
}

function setUp() {
  var dimensions;
  console.log("Setting up");

  dimensions = getOptimalDimensions(img.width, img.height, settings.maxWidth, settings.maxHeight);
  width = dimensions.width;
  height = dimensions.height;
  console.log("Canvas dimensions: ", width, "x", height);

  createCanvases();
  dmCanvas = document.getElementById('dmCanvas');
  dmContext = dmCanvas.getContext('2d');
  mapCanvas = document.getElementById('mapCanvas');
  mapContext = mapCanvas.getContext('2d');

// Need to move this somewhere else
brush = (function(context, settings) {
  var brushTypes = ["clear", "fog"],
      currentBrushType = brushTypes[0],
      currentPattern = null,
      setBrushType = function() {
        console.error("Doesn't exist yet");
      },
      toggle = function() {
        console.log("togglin");
        if (currentBrushType === brushTypes[0]) {
          console.log("shadow");
          currentBrushType = brushTypes[1];
        } else if (currentBrushType === brushTypes[1]) {

          console.log("clear");
          currentBrushType = brushTypes[0];
        } else {
          console.log("nothing: ");
          console.log(currentBrushType);
        }
        context.strokeStyle = getCurrent();
      },
      getPattern = function(brushType) {
        if (brushType === brushTypes[0]) {
    		 context.globalCompositeOperation = 'destination-out';
          //return dmContext.createPattern(getImageCanvas(), 'repeat');
          return 'rgba('+settings.fogRGB+','+settings.fogOpacity+')';
        } else if (brushType === brushTypes[1]) {
          context.globalCompositeOperation = 'source-over';
          return 'rgba('+settings.fogRGB+','+settings.fogOpacity+')';
          //return dmContext.createPattern(getShadowImageCanvas(), 'repeat');
        }

      },
      getCurrent = function() {
        return getPattern(currentBrushType);
      }

  return {
    brushTypes: brushTypes,
    currentBrushType: currentBrushType,
    setBrushType: setBrushType,
    toggle: toggle,
    getCurrent: getCurrent,
    getPattern: getPattern
  }
})(dmContext, settings);



  copyCanvas(mapContext, createImageCanvas(img));
  fogBoard(dmContext);
  dmContext.strokeStyle = brush.getCurrent();
  setUpEvents();
  createPreview();
}

function setUpEvents() {
  dmCanvas.onmousedown = function(e) {
    isDrawing = true;
    var coords = getMouseCoordinates(e);
    points.push(coords);
    // Draw a circle as the start of the brush stroke
    dmContext.beginPath();
    dmContext.arc(coords.x, coords.y, lineWidth/2, 0, Math.PI*2, true);
    dmContext.closePath();
    dmContext.fill();
  };

  dmCanvas.onmousemove = function(e) {
    if (!isDrawing) return;

    points.push(getMouseCoordinates(e));

    var p1 = points[0],
        p2 = points[1];

    dmContext.beginPath();
    dmContext.moveTo(p1.x, p1.y);
    dmContext.lineWidth = lineWidth;
    dmContext.lineJoin = dmContext.lineCap = 'round';

    for (var i = 1, len = points.length; i < len; i++) {
      var midPoint = midPointBtw(p1, p2);
      dmContext.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      p1 = points[i];
      p2 = points[i+1];
    }
    dmContext.lineTo(p1.x, p1.y);
    dmContext.stroke();
  };


  $('#btn-toggle-brush').click(function() {
    var toggleButton = this;
    if (toggleButton.innerHTML === "Clear Brush") {
      toggleButton.innerHTML = "Shadow Brush";
    } else {
      toggleButton.innerHTML = "Clear Brush";
    }
    brush.toggle();
  });
  $('#btn-shroud-all').click(function() {
      fogBoard(dmContext);
      //createPlayerMapImage(mapCanvas, dmCanvas);
  });
  $('#btn-clear-all').click(function() {
      clearBoard(dmContext);
      //createPlayerMapImage(mapCanvas, dmCanvas);
  });

  $('#btn-enlarge-brush').click(function() {
      // If the new width would be over 200, set it to 200
      lineWidth = (lineWidth * 2 > 200) ? 200 : lineWidth * 2;
  });

  $('#btn-shrink-brush').click(function() {
      // If the new width would be less than 1, set it to 1
      lineWidth = (lineWidth / 2 < 1) ? 1 : lineWidth / 2;
  });

  $('#btn-preview').click(function() {
    createPreview();
  });

  $('#btn-send').click(function() {
    var imageData = document.getElementById('preview').src;

    var jqxhr = $.post('upload',
      {
        "imageData" : imageData
      },
      function(e) {
      })
      .done(function(e) {
      })
      .fail(function(e) {
      })
      .always(function(e) {
        console.log(e.response);
      });
  });

  document.addEventListener("mouseup", function() {
    stopDrawing();
  });
}

function createPreview() {
    removePreview();
    createPlayerMapImage(mapCanvas, dmCanvas);
}

function removePreview() {
  $('#preview').remove();
}

$('.app-js').hide();

$('#enter').click(function() {
  $('.splash-js').hide();
  $('.app-js').show();
});

$(function() {
  $('.glass').blurjs({
  	source: '#splash',
  	radius: 10
  });
});


socket.on('chat message', function(msg){
  $('#messages').append($('<li>').text(msg));
});
