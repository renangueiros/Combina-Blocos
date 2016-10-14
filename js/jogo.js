(function () {
    var game = window.game = {};

    game.Grid = function () {

        var size = null;
        var columns;

        var exists = function (x, y) {
            var column = columns[x];
            if (column == null)
                return false;
            var value = column[y];
            if (value == null)
                return false;
            return true;
        };
        var checkValue = function (x, y, num) {
            return exists(x, y) && columns[x][y] == num;
        };

        var isDestroyable = function (x, y) {
            var num = columns[x][y];
            return checkValue(x, y - 1, num) || checkValue(x, y + 1, num)
                    || checkValue(x + 1, y, num) || checkValue(x - 1, y, num);
        };

        var arrayClean = function (array) {
            var clean = [];
            for (var i in array)
                if (array[i] != null)
                    clean.push(array[i]);
            return clean;
        };

        return {

            generate: function (width, height, nbColors) {
                size = {x: width, y: height};
                columns = [];
                for (var x = 0; x < size.x; ++x) {
                    columns[x] = [];
                    var column = columns[x];
                    for (var y = 0; y < size.y; ++y)
                        column[y] = Math.floor(nbColors * Math.random());
                }
                return columns;
            },

            noMoreDestroyable: function () {
                for (var x in columns)
                    for (var y in columns[x])
                        if (isDestroyable(x, y))
                            return false;
                return true;
            },

            isDestroyable: function (x, y) {
                return exists(x, y) && isDestroyable(x, y);
            },

            computeGravity: function () {

                var moveMap = {horizontal: [], vertical: []};

                for (var x = 0; x < columns.length; ++x) {
                    moveMap.vertical[x] = [];
                    moveMap.horizontal[x] = 0;
                }

                for (var x = 0; x < columns.length; ++x) {
                    var column = columns[x];
                    var empty = true;
                    for (var i = 0; i < column.length && empty; ++i)
                        if (column[i] != null)
                            empty = false;
                    if (empty) {
                        var c = x + 1;
                        while (c < columns.length) {
                            if (c > x)
                                --moveMap.horizontal[c];
                            ++c;
                        }
                    } else {
                        var wsCount = 0;
                        for (var y = 0; y < size.y; ++y) {
                            if (!exists(x, y))
                                ++wsCount;
                            else if (wsCount)
                                moveMap.vertical[x].push({y: y, dy: wsCount});
                        }
                    }
                }

                return moveMap;
            },

            computeDestroy: function (x, y) {
                if (!exists(x, y) || !isDestroyable(x, y))
                    return [];

                var computed = [];
                var recCompute = function (x, y, numFilter) {
                    if (!exists(x, y) || columns[x][y] != numFilter)
                        return;

                    for (var i = 0; i < computed.length; ++i)
                        if (computed[i].x == x && computed[i].y == y)
                            return;

                    computed.push({x: x, y: y});
                    recCompute(x, y - 1, numFilter);
                    recCompute(x, y + 1, numFilter);
                    recCompute(x - 1, y, numFilter);
                    recCompute(x + 1, y, numFilter);
                };

                recCompute(x, y, columns[x][y]);
                return computed;
            },

            applyDestroy: function (destroy) {
                for (var d in destroy)
                    columns[destroy[d].x][destroy[d].y] = null;
            },

            applyMoveVertical: function () {
                for (var x in columns)
                    columns[x] = arrayClean(columns[x]);
            },

            applyMoveHorizontal: function () {
                for (var x in columns)
                    if (columns[x].length == 0)
                        columns[x] = null;
                columns = arrayClean(columns);
            },

            getColumns: function () {
                return columns;
            },

            getColumn: function (i) {
                return columns[i] || [];
            },

            getValue: function (x, y) {
                return columns[x] != null ? columns[x][y] : null;
            }
        }
    }();

    game.Canvas = function () {
        var canvas;
        var ctx;

        var gridSize = {w: 20, h: 10};
        var canvasSize = {w: 0, h: 0};
        var brickSize = {w: 0, h: 0};

        var colors = ["#2196F3", "#FFEB3B", "#4CAF50", "#F44336"];
        var nbColor = colors.length;

        var destroyHoverOn;
        var g_hoverDestroyed = null;
        var g_oldBrickHover;

        var brickPosition2canvasPosition = function (x, y) {
            return {x: x * brickSize.w, y: (gridSize.h - y - 1) * brickSize.h};
        };

        var setCursor = function (isPointer) {
            $(canvas).css('cursor', isPointer ? 'pointer' : 'default');
        };

        var setDestroyHover = function (isOn) {
            if (!isOn)
                onMouseOut();
            destroyHoverOn = !isOn ? false : true;
        };

        var animateGravity = function (move, callback) {

            var beginTime;

            var animateTimeY = 200;
            var animateTimeX = 150;
            var lastCycleBrickPositions = [];

            var vertMoveApplied = false;
            var i = 0;

            var cycle = function () {
                var currentTime = new Date();
                if ((currentTime - beginTime) > (animateTimeY + animateTimeX)) {
                    game.Grid.applyMoveHorizontal();
                    callback(move);
                } else {
                    setTimeout(cycle, 30);

                    for (var b in lastCycleBrickPositions) {
                        var bp = lastCycleBrickPositions[b];
                        ctx.clearRect(bp.x, bp.y, brickSize.w, brickSize.h);
                    }
                    lastCycleBrickPositions = [];

                    var currentProgressX, currentProgressY;

                    if ((currentTime - beginTime) < animateTimeY) {
                        currentProgressX = 0;
                        currentProgressY = i == 0 ? 0 : (currentTime - beginTime) / animateTimeY;
                        for (var x in move.vertical) {
                            var col = move.vertical[x];
                            for (var c in col) {
                                var color = game.Grid.getValue(x, col[c].y);
                                if (color != null) {
                                    ctx.fillStyle = colors[color];
                                    var y = col[c].y - col[c].dy * currentProgressY;
                                    var bp = brickPosition2canvasPosition(x, y);
                                    lastCycleBrickPositions.push(bp);
                                    drawBrick(bp.x, bp.y);
                                }
                            }
                        }
                    } else {
                        if (!vertMoveApplied) {
                            vertMoveApplied = true;
                            i = 0;
                            lastCycleBrickPositions = [];
                            game.Grid.applyMoveVertical();

                            for (var x in move.vertical) {
                                var col = move.vertical[x];
                                for (var c in col) {
                                    var y = col[c].y - col[c].dy;
                                    var color = game.Grid.getValue(x, y);
                                    if (color != null) {
                                        ctx.fillStyle = colors[color];
                                        var bp = brickPosition2canvasPosition(x, y);
                                        drawBrick(bp.x, bp.y);
                                    }
                                }
                            }
                        }

                        currentProgressX = i == 0 ? 0 : (currentTime - beginTime - animateTimeY) / animateTimeX;
                        currentProgressY = 1;
                        for (var c = 0; c < move.horizontal.length; ++c) {
                            var col = move.horizontal[c];
                            if (col) {
                                var column = game.Grid.getColumn(c);
                                var x = c + col * currentProgressX;
                                for (var y = 0; y < column.length; ++y) {
                                    var value = column[y];
                                    ctx.fillStyle = colors[value];
                                    var bp = brickPosition2canvasPosition(x, y);
                                    lastCycleBrickPositions.push(bp);
                                    drawBrick(bp.x, bp.y);
                                }
                            }
                        }
                    }
                }
                ++i;
            }
            beginTime = new Date().getTime();
            cycle();
        };

        var animateDestroyed = function (destroyed, callback) {

            var beginTime = new Date().getTime();
            var animateTime = 100;
            var lastProgress = 0;
            var cycle = function () {
                var currentTime = new Date().getTime();
                if ((currentTime - beginTime) > animateTime) {
                    ctx.globalAlpha = 1;
                    callback(destroyed);
                } else {
                    setTimeout(cycle, 30);
                    ctx.fillStyle = $('body').css('background-color');
                    var currentProgress = (currentTime - beginTime) / animateTime;
                    ctx.globalAlpha = currentProgress - lastProgress;
                    for (var i in destroyed) {
                        var bp = brickPosition2canvasPosition(destroyed[i].x, destroyed[i].y);
                        ctx.fillRect(bp.x, bp.y, brickSize.w, brickSize.h);
                    }
                    lastProgress = currentProgress;
                }
            };
            cycle();

        };

        g_onCanvasClick_isRunning = false;
        var onCanvasClick = function (e) {
            if (g_onCanvasClick_isRunning)
                return;
            g_onCanvasClick_isRunning = true;
            var x = e.clientX - $(canvas).position().left;
            var y = e.clientY - $(canvas).position().top + $().scrollTop();
            var brickX = Math.floor(x / brickSize.w);
            var brickY = Math.floor(gridSize.h - y / brickSize.h);
            if (game.Grid.isDestroyable(brickX, brickY)) {

                var columns = game.Grid.getColumns();

                var destroyed = (g_hoverDestroyed != null && g_oldBrickHover != null && g_oldBrickHover.x == brickX && g_oldBrickHover.y == brickY) ?
                        g_hoverDestroyed : game.Grid.computeDestroy(brickX, brickY);

                setDestroyHover(false);

                animateDestroyed(destroyed, function (destroyed) {
                    drawDestroyed(destroyed);
                    game.Grid.applyDestroy(destroyed);

                    animateGravity(game.Grid.computeGravity(), function () {
                        setDestroyHover(true);
                        drawMap();
                        g_onCanvasClick_isRunning = false;
                        if (game.Grid.noMoreDestroyable())
                            end();
                        else
                            $(canvas).one('click', onCanvasClick);
                    });
                });
            } else {
                g_onCanvasClick_isRunning = false;
                $(canvas).one('click', onCanvasClick);
            }
        };

        var onMouseOut = function (e) {
            if (!destroyHoverOn)
                return;
            g_oldBrickHover = null;
        };

        var onMouseMove = function (e) {
            if (!destroyHoverOn)
                return;
            var x = e.clientX - $(canvas).position().left;
            var y = e.clientY - $(canvas).position().top + $().scrollTop();
            var brick = {x: Math.floor(x / brickSize.w), y: Math.floor(gridSize.h - y / brickSize.h)};

            if (!g_oldBrickHover || !(g_oldBrickHover.x == brick.x && g_oldBrickHover.y == brick.y)) {
                g_oldBrickHover = brick;
                g_hoverDestroyed = game.Grid.computeDestroy(brick.x, brick.y);
            }
        };

        var bindHover = function () {
            g_hoverDestroyed = null;
            $(canvas).mouseout(onMouseOut);
            $(canvas).mousemove(onMouseMove);
        };

        var drawDestroyed = function (destroyed) {
            for (b in destroyed) {
                var bp = brickPosition2canvasPosition(destroyed[b].x, destroyed[b].y);
                ctx.clearRect(bp.x, bp.y, brickSize.w, brickSize.h);
            }
        };

        var drawMap = function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var columns = game.Grid.getColumns();
            for (var x = 0; x < columns.length; ++x) {
                var column = columns[x];
                for (var y = 0; y < column.length; ++y) {
                    if (column[y] != null) {
                        ctx.fillStyle = colors[column[y]];
                        var bp = brickPosition2canvasPosition(x, y);
                        drawBrick(bp.x, bp.y);
                    }
                }
            }
        };

        var drawBrick = function (x, y) {
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, brickSize.w, brickSize.h);
            ctx.fillRect(x, y, brickSize.w, brickSize.h);
        };

        var updateBrickSize = function () {
            brickSize = {w: (canvasSize.w / gridSize.w), h: (canvasSize.h / gridSize.h)};
        };

        var updateWindowSize = function () {
            canvasSize = {w: $(canvas).width(), h: $(canvas).height()};
            updateBrickSize();
        };

        var newgame = function () {
            $(canvas).unbind("click");
            $(canvas).one("click", onCanvasClick);
            setDestroyHover(true);
            game.Grid.generate(gridSize.w, gridSize.h, nbColor);
            drawMap();
        };

        var end = function () {
            setDestroyHover(false);
            ctx.fillStyle = "#000000";
            ctx.font = "bold 40px serif";
            ctx.textBaseline = "middle";
            var text = (game.Grid.getColumns().length == 0 ? "Você venceu!" : "você perdeu!");
            ctx.fillText(text, (canvasSize.w - ctx.measureText(text).width) / 2, canvasSize.h / 2);
            setCursor(true);
            $(canvas).one("click", newgame);
        };

        return {
            init: function () {
                canvas = $("#jogoCanvas")[0];
                ctx = canvas.getContext("2d");

                updateWindowSize();
                $(window).resize(function () {
                    updateWindowSize();
                    drawMap();
                });


                bindHover();

                newgame();
            },

            getBrickSize: function () {
                return brickSize;
            },

            getGridSize: function () {
                return gridSize;
            }
        };
    }();

    $(document).ready(game.Canvas.init);

}());