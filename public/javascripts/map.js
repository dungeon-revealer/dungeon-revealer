define(['settings', 'jquery', 'brush'], function (settings, jquery, brush) {
    console.log('map module running');
    return function () {
        var $ = jquery,
            fowContext,
            fowCanvas,
            mapImageContext,
            mapImageCanvas,
            fowBrush,
            mapImage,
            width,
            height;

        function create(parentElem, imgUrl, opts, callback) {
            //TODO: better way to override individual settings properties?
            opts = opts || settings;
            imgUrl = imgUrl || opts.mapImage;

            mapImage = new Image();
            mapImage.onload = function () {
                var container,
                    canvases,
                    dimensions;

                console.log('mapImage loaded');
                console.log('map image url is ' + imgUrl);

                dimensions = getOptimalDimensions(mapImage.width, mapImage.height, opts.maxWidth, opts.maxHeight);
                width = dimensions.width;
                height = dimensions.height;
                console.log("width: " + width + ", height: " + height);
                container = getContainer();
                canvases = createCanvases();
                parentElem.appendChild(container);
                mapImageCanvas = canvases.mapImageCanvas;
                fowCanvas = canvases.fowCanvas;
                container.appendChild(mapImageCanvas);
                container.appendChild(fowCanvas);
                mapImageContext = mapImageCanvas.getContext('2d');
                fowContext = fowCanvas.getContext('2d');
                copyCanvas(mapImageContext, createImageCanvas(mapImage));
                fowBrush = brush(fowContext, opts);
                fowContext.strokeStyle = fowBrush.getCurrent();

                fogMap();
                //setUpEvents();
                //createPreview();
                //console.log(brush);
                callback();
            };
            mapImage.crossOrigin = 'Anonymous'; // to prevent tainted canvas errors
            mapImage.src = imgUrl;


        }

        // TODO: account for multiple containers
        function getContainer() {
            var container = document.getElementById('canvasContainer') || document.createElement("div");
            container.id = "canvasContainer"; //TODO: wont work for multiple containers
            container.style.position = "relative";
            container.style.top = "0";
            container.style.left = "0";
            container.style.margin = "auto";
            container.style.width = width + 'px';
            container.style.height = height + 'px';
            return container;
        }

        function createCanvases() {

            function createCanvas(type, zIndex) {
                console.log("creating canvas " + type);
                var canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.id = type + Math.floor(Math.random()*100000);
                canvas.className = type;
                canvas.style.position = "absolute";
                canvas.style.left = "0";
                canvas.style.top = "0";
                canvas.style.zIndex = zIndex;
                zIndex++;

                return canvas;
            }

            return {
                mapImageCanvas: createCanvas('map-image-canvas', 1),
                fowCanvas: createCanvas('fow-canvas', 2)
            }

        }

        function getMouseCoordinates(e) {
            var viewportOffset = fowCanvas.getBoundingClientRect(),
                borderTop = parseInt($(fowCanvas).css('border-top-width')),
                borderLeft = parseInt($(fowCanvas).css('border-left-width'));
            return {
                x: e.clientX - viewportOffset.left - borderLeft,
                y: e.clientY - viewportOffset.top - borderTop
            }
        }

        function midPointBtw(p1, p2) {
            return {
                x: p1.x + (p2.x - p1.x) / 2,
                y: p1.y + (p2.y - p1.y) / 2
            };
        }

        function getOptimalDimensions(idealWidth, idealHeight, maxWidth, maxHeight) {
            console.log(arguments);
            var ratio = Math.min(maxWidth / idealWidth, maxHeight / idealHeight);
            console.log(ratio);
            return {
                width: idealWidth * ratio,
                height: idealHeight * ratio
            };
        }

        function convertCanvasToImage(canvas) {
            var image = new Image();

            image.src = canvas.toDataURL("image/png");
            return image;
        }

        function copyCanvas(context, canvasToCopy) {
            context.drawImage(canvasToCopy, 0, 0, width, height);
        }

        function mergeCanvas(bottomCanvas, topCanvas) {
            var mergedCanvas = document.createElement('canvas'),
                mergedContext = mergedCanvas.getContext('2d');

            mergedCanvas.width = width;
            mergedCanvas.height = height;
            copyCanvas(mergedContext, bottomCanvas);
            copyCanvas(mergedContext, topCanvas);

            return mergedCanvas;
        }

        // Creates a canvas from an image
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

        function fogMap() {
            resetMap(fowContext, 'fog', fowBrush);
        }

        function clearMap(context) {
            resetMap(context, 'clear');
        }

        function resize(displayWidth, displayHeight) {
            fowCanvas.style.width = displayWidth;
            fowCanvas.style.height = displayHeight;
            mapImageCanvas.style.width = displayWidth + 'px';
            mapImageCanvas.style.height = displayHeight + 'px';
        }

        // Maybe having this here violates cohesion
        function fitMapToWindow() {
            var oldWidth = parseInt(mapImageCanvas.style.width || mapImageCanvas.width, 10),
                oldHeight = parseInt(mapImageCanvas.style.height || mapImageCanvas.height, 10),
                // Using Infinity for new height so as not to limit the image size's width because
                // the height was too large. We want to fill the available width.
                newDims = getOptimalDimensions(oldWidth, oldHeight, window.innerWidth, Infinity);

            resize(newDims.width, newDims.height);
            console.log(newDims);
        }

        function toImage() {
            return convertCanvasToImage(mergeCanvas(mapImageCanvas, fowCanvas));
        }

        function remove() {
            // won't work in IE
            mapImageCanvas.remove();
            fowCanvas.remove();
        }

        return {
            create: create,
            toImage: toImage,
            resize: resize,
            remove: remove,
            fitMapToWindow: fitMapToWindow
        }

    }
});