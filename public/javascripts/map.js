define(['settings', 'jquery', 'brush'], function (settings, jquery, brush) {
    console.log('map module running');
    return function () {
        var $ = jquery,
            fowContext,
            mapImageContext,
            fowBrush,
            mapImage,
            i = 0; // for testing

        // expose as a jquery plug-in
        // could be some issues with this if module is defined in multiple places?
        // TODO: just refactor this if it should be kept, or else delete it
        (function($) {
            console.log('hi');
            $.fn.createMap = function(imgUrl, opts) {
                console.log("createMap()");
                console.log(this);
                return this.each(function() {
                    console.log(this);
                    create(imgUrl, this, opts);
                });
            }
        })(jquery);

        function create(parentElem, imgUrl, opts) {
            //TODO: better way to override individual settings properties?
            opts = opts || settings;
            imgUrl = imgUrl || opts.mapImage;

            var container = getContainer(settings),
                canvases = createCanvases(settings.width, settings.height);

            console.log('map image url is ' + imgUrl);

            parentElem.appendChild(container);
            container.appendChild(canvases.mapImageCanvas);
            container.appendChild(canvases.fowCanvas);
            mapImageContext = canvases.mapImageCanvas.getContext('2d');
            fowContext = canvases.fowCanvas.getContext('2d');

            mapImage = new Image();
            mapImage.onload = function () {
                console.log('mapImage loaded');
                copyCanvas(mapImageContext, createImageCanvas(mapImage));
                //fogBoard(dmContext);
                //dmContext.strokeStyle = brush.getCurrent();
                //setUpEvents();
                //createPreview();
                //console.log(brush);
            };
            mapImage.crossOrigin = 'Anonymous'; // to prevent tainted canvas errors
            mapImage.src = imgUrl;


        }

        // TODO: account for multiple containers
        function getContainer(settings) {
            var container = document.getElementById('canvasContainer') || document.createElement("div");
            container.id = "canvasContainer"; //TODO: wont work for multiple containers
            container.style.position = "relative";
            container.style.top = "0";
            container.style.left = "0";
            container.style.margin = "auto";
            container.style.width = settings.width + 'px';
            container.style.height = settings.height + 'px';
            return container;
        }

        function createCanvases(width, height) {

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

                return canvas;
            }


            return {
                mapImageCanvas: createCanvas('mapImageCanvas', 1),
                fowCanvas: createCanvas('fowCanvas', 2)
            }

        };

        function midPointBtw(p1, p2) {
            return {
                x: p1.x + (p2.x - p1.x) / 2,
                y: p1.y + (p2.y - p1.y) / 2
            };
        }

        function getOptimalDimensions(width, height, maxWidth, maxHeight) {
            var widthCompressionRatio = maxWidth / width,
                heightCompressionRatio = maxHeight / height,
                bestCompressionRatio,
                d = {width: width, height: height};

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

        function convertCanvasToImage(canvas) {
            var image = new Image();

            //TODO: support other image types
            image.src = canvas.toDataURL("image/png");
            return image;
        }

        function copyCanvas(context, canvasToCopy) {
            context.drawImage(canvasToCopy, 0, 0, 500, 500);
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

        function createImageCanvas(img) {
            var imageCanvas = document.createElement("canvas"),
                imageContext = imageCanvas.getContext('2d'),
                width = settings.maxWidth,
                height = settings.maxHeight;

            imageCanvas.width = width;
            imageCanvas.height = height;
            imageContext.drawImage(img, 0, 0, width, height);

            return imageCanvas;
        }

        function resetMap(context, brushType, brush) {
            context.save();
            context.fillStyle = brush.getPattern(brushType);
            context.fillRect(0, 0, width, height);
            context.restore();
        }

        function fogMap(context) {
            resetBoard(context, 'fog');
        }

        function clearMap(context) {
            resetBoard(context, 'clear');
        }

        function resizeMap(width, height) {

        }


        return {
            create: create,
            x: Math.random(),
            y: function () {
                i++
            },
            z: function () {
                return i
            }
        }

    }
});