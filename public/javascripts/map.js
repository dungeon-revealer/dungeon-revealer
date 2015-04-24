define(['settings', 'jquery', 'brush'], function (settings, jquery, brush) {
    console.log('map module loaded');
    return function () {
        var $ = jquery,
            fowContext,
            fowCanvas,
            mapImageContext,
            mapImageCanvas,
            fowBrush,
            mapImage,
            width,
            height,
            isDrawing = false,
            points = [],
            lineWidth = settings.defaultLineWidth,
            fogOpacity = settings.fogOpacity,
            fogRGB = settings.fogRGB;
            
        function extend(obj1, obj2) {
            obj1 = obj1 || {};
            obj2 = obj2 || {};
            for (var attrname in obj2) { obj1[attrname] = obj2[attrname]; }
            return obj1;
        }
        
        function nop() {}

        function create(parentElem, opts) {
            opts = extend(opts, settings);
            
            var imgUrl = opts.imgUrl || opts.mapImage,
                callback = opts.callback || nop,
                error = opts.error || nop;

            mapImage = new Image();
            mapImage.onerror = error;
            mapImage.onload = function () {
                var container,
                    canvases,
                    dimensions;

                console.log('mapImage loaded');

                // TODO: make this more readable
                dimensions = getOptimalDimensions(mapImage.width, mapImage.height, opts.maxWidth, opts.maxHeight);
                width = dimensions.width;
                height = dimensions.height;
                console.log('width: ' + width + ', height: ' + height);
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
                createRender();
                setUpDrawingEvents();
                callback();
            };
            mapImage.crossOrigin = 'Anonymous'; // to prevent tainted canvas errors
            mapImage.src = imgUrl;
        }

        // TODO: account for multiple containers
        function getContainer() {
            var container = document.getElementById('canvasContainer') || document.createElement('div');
            
            container.id = 'canvasContainer'; //TODO: wont work for multiple containers
            container.style.position = 'relative';
            container.style.top = '0';
            container.style.left = '0';
            container.style.margin = 'auto';
            //container.style.width = width + 'px';
            //container.style.height = height + 'px';
            
            return container;
        }

        function createCanvases() {

            function createCanvas(type, zIndex) {
                var canvas = document.createElement('canvas');
                
                console.log('creating canvas ' + type);
                canvas.width = width;
                canvas.height = height;
                canvas.id = type + Math.floor(Math.random()*100000);
                canvas.className = type + ' map-canvas';
                canvas.style.position = 'absolute';
                canvas.style.left = '0';
                canvas.style.top = '0';
                canvas.style.zIndex = zIndex;
                zIndex++;

                return canvas;
            }

            return {
                mapImageCanvas: createCanvas('map-image-canvas', 1),
                fowCanvas: createCanvas('fow-canvas', 2)
            };

        }

        function getMouseCoordinates(e) {
            var viewportOffset = fowCanvas.getBoundingClientRect(),
                borderTop = parseInt($(fowCanvas).css('border-top-width')),
                borderLeft = parseInt($(fowCanvas).css('border-left-width'));
                
            return {
                x: (e.clientX - viewportOffset.left - borderLeft) / getMapDisplayRatio(),
                y: (e.clientY - viewportOffset.top - borderTop) / getMapDisplayRatio()
            };
        }

        function midPointBtw(p1, p2) {
            return {
                x: p1.x + (p2.x - p1.x) / 2,
                y: p1.y + (p2.y - p1.y) / 2
            };
        }

        function getOptimalDimensions(idealWidth, idealHeight, maxWidth, maxHeight) {
            var ratio = Math.min(maxWidth / idealWidth, maxHeight / idealHeight);
            
            return {
                ratio: ratio,
                width: idealWidth * ratio,
                height: idealHeight * ratio
            };
        }

        function convertCanvasToImage(canvas) {
            var image = new Image();

            image.src = canvas.toDataURL('image/png');
            
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
            var imageCanvas = document.createElement('canvas'),
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
            resetMap(fowContext, 'clear', fowBrush);
            //resetMap(context, 'clear');
        }

        function resize(displayWidth, displayHeight) {
            fowCanvas.style.width = displayWidth + 'px';
            fowCanvas.style.height = displayHeight + 'px';
            mapImageCanvas.style.width = displayWidth + 'px';
            mapImageCanvas.style.height = displayHeight + 'px';
        }

        // Maybe having this here violates cohesion
        function fitMapToWindow() {
            var oldWidth = parseInt(mapImageCanvas.style.width || mapImageCanvas.width, 10),
                oldHeight = parseInt(mapImageCanvas.style.height || mapImageCanvas.height, 10),
                newDims = getOptimalDimensions(oldWidth, oldHeight, window.innerWidth, Infinity);

            resize(newDims.width, newDims.height);
        }

        function toImage() {
            return convertCanvasToImage(mergeCanvas(mapImageCanvas, fowCanvas));
        }

        function remove() {
            // won't work in IE
            mapImageCanvas.remove();
            fowCanvas.remove();
        }
        
        function getMapDisplayRatio() {
            return parseFloat(mapImageCanvas.style.width, 10) / mapImageCanvas.width;
        }

        function setUpDrawingEvents() {
            fowCanvas.onmousedown = function (e) {
                isDrawing = true;
                var coords = getMouseCoordinates(e);
                points.push(coords);
                // Draw a circle as the start of the brush stroke
                fowContext.beginPath();
                fowContext.arc(coords.x, coords.y, lineWidth / 2, 0, Math.PI * 2, true);
                fowContext.closePath();
                fowContext.fill();
            };

            fowCanvas.onmousemove = function (e) {
                var p1, p2;
                
                if (!isDrawing) return;

                points.push(getMouseCoordinates(e));
                p1 = points[0];
                p2 = points[1];

                fowContext.beginPath();
                fowContext.moveTo(p1.x, p1.y);
                fowContext.lineWidth = lineWidth;
                fowContext.lineJoin = fowContext.lineCap = 'round';

                for (var i = 1, len = points.length; i < len; i++) {
                    var midPoint = midPointBtw(p1, p2);
                    fowContext.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
                    p1 = points[i];
                    p2 = points[i + 1];
                }
                
                fowContext.lineTo(p1.x, p1.y);
                fowContext.stroke();
            };

            //TODO: move all of this jquery stuff somewhere else
            
            $('#btn-toggle-brush').click(function () {
                var toggleButton = this;
                if (toggleButton.innerHTML === 'Clear Brush') {
                    toggleButton.innerHTML = 'Shadow Brush';
                } else {
                    toggleButton.innerHTML = 'Clear Brush';
                }
                fowBrush.toggle();
            });
            
            $('#btn-shroud-all').click(function () {
                fogMap(fowContext);
                createRender();
            });
            
            $('#btn-clear-all').click(function () {
                clearMap(fowContext);
                createRender();
            });

            $('#btn-enlarge-brush').click(function () {
                // If the new width would be over 200, set it to 200
                lineWidth = (lineWidth * 2 > 200) ? 200 : lineWidth * 2;
            });

            $('#btn-shrink-brush').click(function () {
                // If the new width would be less than 1, set it to 1
                lineWidth = (lineWidth / 2 < 1) ? 1 : lineWidth / 2;
            });

            $('#btn-render').click(function () {
                createRender();
            });

            document.addEventListener('mouseup', function () {
                stopDrawing();
            });
        }

        function stopDrawing() {
            if (isDrawing) {
                createRender();
            }
            isDrawing = false;
            points.length = 0;
        }
        
        //todo: move this functionality elsewher
        function createRender() {
            removeRender();
            createPlayerMapImage(mapImageCanvas, fowCanvas);
        }
    
        function removeRender() {
            $('#render').remove();
        }
        
        function createPlayerMapImage(bottomCanvas, topCanvas) {
            var mergedCanvas = mergeCanvas(bottomCanvas, topCanvas),
                mergedImage = convertCanvasToImage(mergedCanvas);
                
            mergedImage.id = 'render';
            
            //todo: refactor this functionality outside
            document.querySelector('#map-wrapper').appendChild(mergedImage);
        }

        return {
            create: create,
            toImage: toImage,
            resize: resize,
            remove: remove,
            fitMapToWindow: fitMapToWindow
        };

    };
});