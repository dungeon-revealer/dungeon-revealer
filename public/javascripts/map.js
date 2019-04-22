define(['settings', 'jquery', 'brush'], function (settings, jquery, brush) {
    console.log('map module loaded');
    return function () {
        var $ = jquery,
            cursorContext,
            cursorCanvas,
            fowContext,
            fowCanvas,
            mapImageContext,
            mapImageCanvas,
            fowBrush,
            mapImage,
            width,
            height,
            isDrawing = false,
            isTouch = false,
            points = [],
            lineWidth = settings.defaultLineWidth,
            brushShape = settings.defaultBrushShape,
            fogOpacity = settings.fogOpacity,
            fogRGB = settings.fogRGB;

        function extend(obj1, obj2) {
            obj1 = obj1 || {};
            obj2 = obj2 || {};
            for (var attrname in obj2) {
                obj1[attrname] = obj2[attrname];
            }
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
                cursorCanvas = canvases.cursorCanvas;
                container.appendChild(mapImageCanvas);
                container.appendChild(fowCanvas);
                container.appendChild(cursorCanvas);
                mapImageContext = mapImageCanvas.getContext('2d');
                fowContext = fowCanvas.getContext('2d');
                cursorContext = cursorCanvas.getContext('2d');
                copyCanvas(mapImageContext, createImageCanvas(mapImage));
                fowBrush = brush(fowContext, opts);
                fowContext.strokeStyle = fowBrush.getCurrent();
                fogMap();
                createRender();
                setUpDrawingEvents();
                setupCursorTracking();
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
                canvas.id = type + Math.floor(Math.random() * 100000);
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
                fowCanvas: createCanvas('fow-canvas', 2),
                cursorCanvas: createCanvas('cursor-canvas', 3)
            };

        }

        function getTouchCoordinates(e) {
            var viewportOffset = fowCanvas.getBoundingClientRect(),
                borderTop = parseInt($(fowCanvas).css('border-top-width')),
                borderLeft = parseInt($(fowCanvas).css('border-left-width'));
            
            return {
                x: (e.touches[0].pageX - viewportOffset.left - borderLeft - document.documentElement.scrollLeft) / getMapDisplayRatio(),
                y: (e.touches[0].pageY - viewportOffset.top - borderTop- document.documentElement.scrollTop) / getMapDisplayRatio()
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
            //console.log(p1)
            //console.log(p2)

            return {
                x: p1.x + (p2.x - p1.x) / 2,
                y: p1.y + (p2.y - p1.y) / 2
            }

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
            cursorCanvas.style.width = displayWidth + 'px';
            cursorCanvas.style.height = displayHeight + 'px';
        }

        // Maybe having this here violates cohesion
        function fitMapToWindow() {
            var oldWidth = parseInt(mapImageCanvas.style.width || mapImageCanvas.width, 10),
                oldHeight = parseInt(mapImageCanvas.style.height || mapImageCanvas.height, 10),
                newDims = getOptimalDimensions(oldWidth, oldHeight, $(window).width(), Infinity);

            resize(newDims.width, newDims.height);
        }

        function toImage() {
            return convertCanvasToImage(mergeCanvas(mapImageCanvas, fowCanvas));
        }

        function remove() {
            // won't work in IE
            mapImageCanvas.remove();
            fowCanvas.remove();
            cursorCanvas.remove();
        }

        function getMapDisplayRatio() {
            return parseFloat(mapImageCanvas.style.width, 10) / mapImageCanvas.width;
        }

        function constructMask(cords) {
            var maskDimensions = {
                x: cords.x,
                y: cords.y,
                lineWidth: 2,
                line: 'aqua',
                fill: 'transparent'
            };

            if (brushShape == 'round') {
                maskDimensions.r = lineWidth / 2;
                maskDimensions.startingAngle = 0;
                maskDimensions.endingAngle = Math.PI * 2
            } else if (brushShape == 'square') {

                maskDimensions.centerX = maskDimensions.x - lineWidth / 2;
                maskDimensions.centerY = maskDimensions.y - lineWidth / 2;
                maskDimensions.height = lineWidth;
                maskDimensions.width = lineWidth;
            } else {
                throw new Error('brush shape not found')
            }

            return maskDimensions

        }

        // Constructs the corner coordinates of a square given its central cord and the global lineWidth. The square is
        // described in a clockwise fashion
        function constructCoordinates(cords) {
            // Corners
            // 1 - bottom left
            // 2 - top left
            // 3 - top right
            // 4 - bottom right

            // Note: 0,0 starts in top left. Remember this when doing calculations for corners, the y axis calculations
            // need to be flipped vs bottom left orientation

            var r = lineWidth / 2;
            return {
                1: {
                    x: cords.x - r,
                    y: cords.y + r
                },
                2: {
                    x: cords.x - r,
                    y: cords.y - r
                },
                3: {
                    x: cords.x + r,
                    y: cords.y - r
                },
                4: {
                    x: cords.x + r,
                    y: cords.y + r
                }
            }
        }

        // Pythagorean theorem for distance between two cords
        function distanceBetweenCords(cords1, cords2) {
            var a = cords1.x - cords2.x
            var b = cords1.y - cords2.y

            var distance = Math.sqrt(a * a + b * b);

            return distance
        }

        // Stolen function for multi attribute sort
        function orderByProperty(prop) {
            var args = Array.prototype.slice.call(arguments, 1);
            return function (a, b) {
                var equality = a[prop] - b[prop];
                if (equality === 0 && arguments.length > 1) {
                    return orderByProperty.apply(null, args)(a, b);
                }
                return equality;
            };
        }

        // Finds the optimal rhombus to act as a connecting path between two square masks
        // This function takes the coordinates of the current and previous square masks and compares the distances to the
        // midpoint between the two squares to find the correct rhombus that describes a smooth fill between the two.
        // You could achieve the same thing by constructing four walls around each set of
        // squares, but you would end up with 4x as many "connecting" objects -> poor performance
        // Note: I'm pretty sure I've just recreated some standard geometry algorithm and this whole section
        // could be swapped out with a function.
        function findOptimalRhombus(pointCurrent, pointPrevious) {
            // Find midpoint between two points
            var midPoint = midPointBtw(pointPrevious, pointCurrent)

            // Exten d points to coordinates
            var pointCurrentCoordinates = constructCoordinates(pointCurrent),
                pointPreviousCoordinates = constructCoordinates(pointPrevious)

            // Arrays and Objects
            var allPoints = [], // All points are placed into this array
                counts = {}, // count distinct of distances
                limitedPoints // subset of correct points

            // Load the points into allpoints with a field documenting their origin and corner
            for (var key in pointCurrentCoordinates) {
                pointCurrentCoordinates[key].corner = key;
                pointCurrentCoordinates[key].version = 2;
                allPoints.push(pointCurrentCoordinates[key])
            }
            for (var key in pointPreviousCoordinates) {
                pointPreviousCoordinates[key].corner = key;
                pointPreviousCoordinates[key].version = 1;
                allPoints.push(pointPreviousCoordinates[key])
            }

            // For each point find the distance between the cord and the midpoint
            for (var j = 0, allPointsLength = allPoints.length; j < allPointsLength; j++) {
                allPoints[j].distance = distanceBetweenCords(midPoint, allPoints[j]).toFixed(10)
            }

            // count distinct distances into counts object
            allPoints.forEach(function (x) {
                var distance = x.distance;
                counts[distance] = (counts[distance] || 0) + 1;
            });

            // Sort allPoints by distance
            allPoints.sort(function (a, b) {
                return a.distance - b.distance;
            });

            // There are three scenarios
            // 1. the squares are perfectly vertically or horizontally aligned:
            ////  In this case, there will be two distinct lengths between the mid point, In this case, we want to take
            ////  the coordinates with the shortest distance to the midpoint
            // 2. The squares are offset vertically and horizontally. In this case, there will be 3 or 4 distinct lengths between
            ////  the coordinates, 2 that are the shortest, 4 that are in the middle, and 2 that are the longest. We want
            ////  the middle 4

            // Determine the number of distances
            var numberOfDistances = Object.keys(counts).length;

            if (numberOfDistances == 2) {
                limitedPoints = allPoints.slice(0, 4)
            } else if (numberOfDistances == 3 || numberOfDistances == 4) {
                limitedPoints = allPoints.slice(2, 6)
            } else {
                // if the distance is all the same, the square masks haven't moved, so just return
                return
            }

            // error checking
            if (limitedPoints.length != 4) {
                throw new Error('unexpected number of points')
            }

            var limitedPointsSorted = limitedPoints.sort(orderByProperty('corner', 'version'));
            if (numberOfDistances > 2) {
                // for horizontally and verically shifted, the sort order needs a small hack so the drawing of the
                // rectangle works correctly
                var temp = limitedPointsSorted[2];
                limitedPointsSorted[2] = limitedPointsSorted[3];
                limitedPointsSorted[3] = temp
            }
            return limitedPointsSorted
        }

        function setupCursorTracking() {
            function drawStart (cords) {
                // Start drawing
                isDrawing = true;

                // Draw initial Shape
                // set lineWidth to 0 for initial drawing of shape to prevent screwing up of size/placement
                fowCanvas.drawInitial(cords)
            }

            function drawStartMousedown(e) {
                if (isTouch) {
                    return;
                }
                var cords = getMouseCoordinates(e);
                drawStart(cords)
            }

            function drawStartTouchstart(e) {
                e.preventDefault();
                isTouch = true
                var cords = getTouchCoordinates(e)
                drawStart(cords);
            }

            // Mouse Click
            cursorCanvas.addEventListener('mousedown', drawStartMousedown);
            cursorCanvas.addEventListener('touchstart', drawStartTouchstart);

            function drawContinue(cords) {
                if (isDrawing) {
                    points.push(cords)
                }
                // Draw cursor and fow
                cursorCanvas.drawCursor(cords);
                fowCanvas.draw(points);
            }

            function drawContinueMousemove(e) {
                //get cords and points
                var cords = getMouseCoordinates(e);
                drawContinue(cords);
            }

            function drawContinueTouchmove(e) {
                e.preventDefault();
                var cords = getTouchCoordinates(e);
                drawContinue(cords);
            }

            // Mouse Move
            cursorCanvas.addEventListener('mousemove', drawContinueMousemove);
            cursorCanvas.addEventListener('touchmove', drawContinueTouchmove);



            cursorCanvas.drawCursor = function (cords) {
                // Cleanup
                cursorContext.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

                // Construct circle dimensions
                var cursorMask = constructMask(cords);

                cursorContext.strokeStyle = cursorMask.line;
                cursorContext.fillStyle = cursorMask.fill;
                cursorContext.lineWidth = cursorMask.lineWidth;

                cursorContext.beginPath();
                if (brushShape == 'round') {
                    cursorContext.arc(
                        cursorMask.x,
                        cursorMask.y,
                        cursorMask.r,
                        cursorMask.startingAngle,
                        cursorMask.endingAngle,
                        true
                    );
                } else if (brushShape == 'square') {
                    cursorContext.rect(
                        cursorMask.centerX,
                        cursorMask.centerY,
                        cursorMask.height,
                        cursorMask.width);
                }

                cursorContext.fill();
                cursorContext.stroke();
            }

        }

        function setUpDrawingEvents() {
            fowCanvas.drawInitial = function (coords) {

                // Construct mask dimensions
                var fowMask = constructMask(coords);
                fowContext.lineWidth = fowMask.lineWidth;

                fowContext.beginPath();
                if (brushShape == 'round') {
                    fowContext.arc(
                        fowMask.x,
                        fowMask.y,
                        fowMask.r,
                        fowMask.startingAngle,
                        fowMask.endingAngle,
                        true
                    );
                } else if (brushShape == 'square') {
                    fowContext.rect(
                        fowMask.centerX,
                        fowMask.centerY,
                        fowMask.height,
                        fowMask.width);
                }

                fowContext.fill();
                fowContext.stroke();
            };

            fowCanvas.draw = function (points) {

                if (!isDrawing) return;

                var pointPrevious, // the previous point
                    pointCurrent = points[0]; //  the current point

                // For each point create a quadraticCurve btweeen each point
                if (brushShape == 'round') {

                    // Start Path
                    fowContext.lineWidth = lineWidth;
                    fowContext.lineJoin = fowContext.lineCap = 'round';
                    fowContext.beginPath();

                    fowContext.moveTo(pointCurrent.x, pointCurrent.y);
                    for (var i = 1, len = points.length; i < len; i++) {
                        // Setup points
                        pointCurrent = points[i];
                        pointPrevious = points[i - 1];

                        // Coordinates
                        var midPoint = midPointBtw(pointPrevious, pointCurrent);
                        fowContext.quadraticCurveTo(pointPrevious.x, pointPrevious.y, midPoint.x, midPoint.y);
                        fowContext.lineTo(pointCurrent.x, pointCurrent.y);
                        fowContext.stroke();
                    }
                } else if (brushShape == 'square') {
                    // The goal of this area is to draw lines with a square mask

                    // The fundamental issue is that not every position of the mouse is recorded when it is moved
                    // around the canvas (particularly when it is moved fast). If it were, we could simply draw a
                    // square at every single coordinate

                    // a simple approach is to draw an initial square then connect a line to a series of
                    // central cords with a square lineCap. Unfortunately, this has undesirable behavior. When moving in
                    // a diagonal, the square linecap rotates into a diamond, and "draws" outside of the square mask.

                    // Using 'butt' lineCap lines to connect between squares drawn at each set of cords has unexpected behavior.
                    // When moving in a diagonal fashion. The width does not correspond to the "face" of the cursor, which
                    // maybe longer then the length / width (think hypotenuse) which results in weird drawing.

                    // The current solution is two fold
                    // 1. Draw a rectangle at every available cord
                    // 2. Find and draw the optimal rhombus to connect each square

                    fowContext.lineWidth = 1
                    fowContext.beginPath();

                    // The initial square mask is drawn by drawInitial, so we doing need to start at points[0].
                    // Therefore we start point[1].
                    for (var i = 1, len = points.length; i < len; i++) {
                        // Setup points
                        pointCurrent = points[i];
                        pointPrevious = points[i - 1];

                        if (!pointCurrent || !pointPrevious) {
                            throw new Error('points are incorrect')
                        }

                        // draw rectangle at current point
                        var fowMask = constructMask(pointCurrent);
                        fowContext.fillRect(
                            fowMask.centerX,
                            fowMask.centerY,
                            fowMask.height,
                            fowMask.width);

                        // optimal polygon to draw to connect two square
                        var optimalPoints = findOptimalRhombus(pointCurrent, pointPrevious);
                        if (optimalPoints) {
                            fowContext.moveTo(optimalPoints[0].x, optimalPoints[0].y);
                            fowContext.lineTo(optimalPoints[1].x, optimalPoints[1].y);
                            fowContext.lineTo(optimalPoints[2].x, optimalPoints[2].y);
                            fowContext.lineTo(optimalPoints[3].x, optimalPoints[3].y);
                            fowContext.fill();
                        }
                    }
                }
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
                //createRender();
            });

            $('#btn-clear-all').click(function () {
                clearMap(fowContext);
                //createRender();
            });

            $('#btn-enlarge-brush').click(function () {
                // If the new width would be over 200, set it to 200
                lineWidth = (lineWidth * 2 > 200) ? 200 : lineWidth * 2;
            });

            $('#btn-shrink-brush').click(function () {
                // If the new width would be less than 1, set it to 1
                lineWidth = (lineWidth / 2 < 1) ? 1 : lineWidth / 2;
            });

            $('#btn-shape-brush').click(function () {
                var toggleButton = this;
                if (toggleButton.innerHTML === 'Square Brush') {
                    toggleButton.innerHTML = 'Circle Brush';
                    brushShape = 'square'
                } else {
                    toggleButton.innerHTML = 'Square Brush';
                    brushShape = 'round'
                }

            });

            $('#btn-render').click(function () {
                //createRender();
            });

            $('#btn-send').click(function () {
                createRender();
                var imageData = document.getElementById('render').src;

                var jqxhr = $.post('/send', {
                            'imageData': imageData
                        },
                        function (e) {})
                    .done(function (e) {})
                    .fail(function (e) {})
                    .always(function (e) {
                        if (e.success) {
                            console.log(e.responseText);
                        } else {
                            console.error(e.responseText);
                        }
                    });
            });

            document.addEventListener('mouseup', function () {
                stopDrawing();
            });
            document.addEventListener('touchend', function (e) {
                if (isDrawing) {
                    e.preventDefault();
                }
                stopDrawing();
            });
            document.addEventListener('touchcancel', function (e) {
                if (isDrawing) {
                    e.preventDefault();
                }
                stopDrawing();
            });
        }

        function stopDrawing() {
            if (isDrawing) {
                //createRender();
            }
            isTouch = false;
            isDrawing = false;
            points = []
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
    }

});
