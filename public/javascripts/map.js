define(['settings', 'jquery', 'brush'], function (settings, jquery, brush) {
    return function() {
        var $ = jquery,
            fowContext,
            mapImageContext,
            fowBrush = brush(),
            i = 0; // for testing


        function create(opts) {
            opts = opts || settings;
        }

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
            context.drawImage(canvasToCopy, 0, 0, width, height);
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

        //TODO: rename?
        function resetBoard(context, brushType, brush) {
            context.save();
            context.fillStyle = brush.getPattern(brushType);
            context.fillRect(0, 0, width, height);
            context.restore();
        }

        //TODO: rename?
        function fogBoard(context) {
            resetBoard(context, 'fog');
        }

        //TODO: rename?
        function clearBoard(context) {
            resetBoard(context, 'clear');
        }


        return {
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