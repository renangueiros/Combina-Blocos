(function () {

    var jogo = window.jogo = {};

    jogo.Grade = function () {

        var tamanho = null;
        var colunas;

        var existe = function (x, y) {
            var coluna = colunas[x];
            if (coluna == null)
                return false;
            var value = coluna[y];
            if (value == null)
                return false;
            return true;
        };

        var checaValor = function (x, y, num) {
            return existe(x, y) && colunas[x][y] == num;
        };

        var podeDestruir = function (x, y) {
            var num = colunas[x][y];
            return checaValor(x, y - 1, num) || checaValor(x, y + 1, num)
                    || checaValor(x + 1, y, num) || checaValor(x - 1, y, num);
        };

        var limpaArray = function (array) {
            var arrayLimpo = [];
            for (var i in array)
                if (array[i] != null)
                    arrayLimpo.push(array[i]);
            return arrayLimpo;
        };

        return {

            geraGrade: function (width, height, nbColors) {
                tamanho = {x: width, y: height};
                colunas = [];

                for (var x = 0; x < tamanho.x; ++x) {
                    colunas[x] = [];
                    var column = colunas[x];
                    for (var y = 0; y < tamanho.y; ++y)
                        column[y] = Math.floor(nbColors * Math.random());
                }

                return colunas;
            },

            naoPodeDestruir: function () {
                for (var x in colunas)
                    for (var y in colunas[x])
                        if (podeDestruir(x, y))
                            return false;
                return true;
            },

            podeDestruir: function (x, y) {
                return existe(x, y) && podeDestruir(x, y);
            },

            computaGravidade: function () {

                var moveMapa = {horizontal: [], vertical: []};

                for (var x = 0; x < colunas.length; ++x) {
                    moveMapa.vertical[x] = [];
                    moveMapa.horizontal[x] = 0;
                }

                for (var x = 0; x < colunas.length; ++x) {
                    var column = colunas[x];
                    var vazio = true;
                    for (var i = 0; i < column.length && vazio; ++i)
                        if (column[i] != null)
                            vazio = false;
                    if (vazio) {
                        var c = x + 1;
                        while (c < colunas.length) {
                            if (c > x)
                                --moveMapa.horizontal[c];
                            ++c;
                        }
                    } else {
                        var espacoBranco = 0;
                        for (var y = 0; y < tamanho.y; ++y) {
                            if (!existe(x, y))
                                ++espacoBranco;
                            else if (espacoBranco)
                                moveMapa.vertical[x].push({y: y, dy: espacoBranco});
                        }
                    }
                }

                return moveMapa;
            },

            computeDestroy: function (x, y) {
                if (!existe(x, y) || !podeDestruir(x, y))
                    return [];

                var computado = [];
                var garvarComputado = function (x, y, numFilter) {
                    if (!existe(x, y) || colunas[x][y] != numFilter)
                        return;

                    for (var i = 0; i < computado.length; ++i)
                        if (computado[i].x == x && computado[i].y == y)
                            return;

                    computado.push({x: x, y: y});
                    garvarComputado(x, y - 1, numFilter);
                    garvarComputado(x, y + 1, numFilter);
                    garvarComputado(x - 1, y, numFilter);
                    garvarComputado(x + 1, y, numFilter);
                };

                garvarComputado(x, y, colunas[x][y]);
                return computado;
            },

            aplicarDestrucao: function (destroy) {
                for (var d in destroy)
                    colunas[destroy[d].x][destroy[d].y] = null;
            },

            aplicarMovimentoVertical: function () {
                for (var x in colunas)
                    colunas[x] = limpaArray(colunas[x]);
            },

            aplicarMovimentoHorizontal: function () {
                for (var x in colunas)
                    if (colunas[x].length == 0)
                        colunas[x] = null;
                colunas = limpaArray(colunas);
            },

            obtemColunas: function () {
                return colunas;
            },

            obtemColuna: function (i) {
                return colunas[i] || [];
            },

            obtemValor: function (x, y) {
                return colunas[x] != null ? colunas[x][y] : null;
            }
        }
    }();

    jogo.Canvas = function () {
        var canvas;
        var contexto;

        var tamanhoGrade = {l: 20, a: 10};
        var tamanhaCanvas = {l: 0, a: 0};
        var tamanhoBloco = {l: 0, a: 0};

        var cores = ["#2196F3", "#FFEB3B", "#4CAF50", "#F44336"];
        var numeroCores = cores.length;

        var destroyHoverOn;
        var g_hoverDestroyed = null;
        var g_oldBrickHover;

        var transfromaPosicaoBloco = function (x, y) {
            return {x: x * tamanhoBloco.l, y: (tamanhoGrade.a - y - 1) * tamanhoBloco.a};
        };

        var setDestroyHover = function (isOn) {
            if (!isOn)
                onMouseOut();
            destroyHoverOn = !isOn ? false : true;
        };

        var animaGravidade = function (move, callback) {

            var inicio;

            var animacaoTempoY = 200;
            var animacaoTempoX = 150;
            var posicaoUtimosBlocos = [];

            var movimentoVerticalAplicado = false;
            var i = 0;

            var ciclo = function () {
                var agora = new Date();
                if ((agora - inicio) > (animacaoTempoY + animacaoTempoX)) {
                    jogo.Grade.aplicarMovimentoHorizontal();
                    callback(move);
                } else {
                    setTimeout(ciclo, 30);

                    for (var b in posicaoUtimosBlocos) {
                        var bp = posicaoUtimosBlocos[b];
                        contexto.clearRect(bp.x, bp.y, tamanhoBloco.l, tamanhoBloco.a);
                    }
                    posicaoUtimosBlocos = [];

                    var progressoAtualX, progressoAtualY;

                    if ((agora - inicio) < animacaoTempoY) {
                        progressoAtualX = 0;
                        progressoAtualY = i == 0 ? 0 : (agora - inicio) / animacaoTempoY;
                        for (var x in move.vertical) {
                            var col = move.vertical[x];
                            for (var c in col) {
                                var color = jogo.Grade.obtemValor(x, col[c].y);
                                if (color != null) {
                                    contexto.fillStyle = cores[color];
                                    var y = col[c].y - col[c].dy * progressoAtualY;
                                    var bp = transfromaPosicaoBloco(x, y);
                                    posicaoUtimosBlocos.push(bp);
                                    desenhaBloco(bp.x, bp.y);
                                }
                            }
                        }
                    } else {
                        if (!movimentoVerticalAplicado) {
                            movimentoVerticalAplicado = true;
                            i = 0;
                            posicaoUtimosBlocos = [];
                            jogo.Grade.aplicarMovimentoVertical();

                            for (var x in move.vertical) {
                                var col = move.vertical[x];
                                for (var c in col) {
                                    var y = col[c].y - col[c].dy;
                                    var color = jogo.Grade.obtemValor(x, y);
                                    if (color != null) {
                                        contexto.fillStyle = cores[color];
                                        var bp = transfromaPosicaoBloco(x, y);
                                        desenhaBloco(bp.x, bp.y);
                                    }
                                }
                            }
                        }

                        progressoAtualX = i == 0 ? 0 : (agora - inicio - animacaoTempoY) / animacaoTempoX;
                        progressoAtualY = 1;

                        for (var c = 0; c < move.horizontal.length; ++c) {
                            var col = move.horizontal[c];
                            if (col) {
                                var coluna = jogo.Grade.obtemColuna(c);
                                var x = c + col * progressoAtualX;
                                for (var y = 0; y < coluna.length; ++y) {
                                    var value = coluna[y];
                                    contexto.fillStyle = cores[value];
                                    var bp = transfromaPosicaoBloco(x, y);
                                    posicaoUtimosBlocos.push(bp);
                                    desenhaBloco(bp.x, bp.y);
                                }
                            }
                        }
                    }
                }
                ++i;
            }

            inicio = new Date().getTime();
            ciclo();
        };

        var animateDestroyed = function (destroyed, callback) {

            var beginTime = new Date().getTime();
            var animateTime = 100;
            var lastProgress = 0;
            var cycle = function () {
                var currentTime = new Date().getTime();
                if ((currentTime - beginTime) > animateTime) {
                    contexto.globalAlpha = 1;
                    callback(destroyed);
                } else {
                    setTimeout(cycle, 30);
                    contexto.fillStyle = $('body').css('background-color');
                    var currentProgress = (currentTime - beginTime) / animateTime;
                    contexto.globalAlpha = currentProgress - lastProgress;
                    for (var i in destroyed) {
                        var bp = transfromaPosicaoBloco(destroyed[i].x, destroyed[i].y);
                        contexto.fillRect(bp.x, bp.y, tamanhoBloco.l, tamanhoBloco.a);
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
            var brickX = Math.floor(x / tamanhoBloco.l);
            var brickY = Math.floor(tamanhoGrade.a - y / tamanhoBloco.a);
            if (jogo.Grade.podeDestruir(brickX, brickY)) {

                var columns = jogo.Grade.obtemColunas();

                var destroyed = (g_hoverDestroyed != null && g_oldBrickHover != null && g_oldBrickHover.x == brickX && g_oldBrickHover.y == brickY) ?
                        g_hoverDestroyed : jogo.Grade.computeDestroy(brickX, brickY);

                setDestroyHover(false);

                animateDestroyed(destroyed, function (destroyed) {
                    drawDestroyed(destroyed);
                    jogo.Grade.aplicarDestrucao(destroyed);

                    animaGravidade(jogo.Grade.computaGravidade(), function () {
                        setDestroyHover(true);
                        desenhaBlocos();
                        g_onCanvasClick_isRunning = false;
                        if (jogo.Grade.naoPodeDestruir())
                            fimJogo();
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
            var brick = {x: Math.floor(x / tamanhoBloco.l), y: Math.floor(tamanhoGrade.a - y / tamanhoBloco.a)};

            if (!g_oldBrickHover || !(g_oldBrickHover.x == brick.x && g_oldBrickHover.y == brick.y)) {
                g_oldBrickHover = brick;
                g_hoverDestroyed = jogo.Grade.computeDestroy(brick.x, brick.y);
            }
        };

        var bindHover = function () {
            g_hoverDestroyed = null;
            $(canvas).mouseout(onMouseOut);
            $(canvas).mousemove(onMouseMove);
        };

        var drawDestroyed = function (destroyed) {
            for (b in destroyed) {
                var bp = transfromaPosicaoBloco(destroyed[b].x, destroyed[b].y);
                contexto.clearRect(bp.x, bp.y, tamanhoBloco.l, tamanhoBloco.a);
            }
        };

        var desenhaBlocos = function () {
            contexto.clearRect(0, 0, canvas.width, canvas.height);
            var columns = jogo.Grade.obtemColunas();
            for (var x = 0; x < columns.length; ++x) {
                var column = columns[x];
                for (var y = 0; y < column.length; ++y) {
                    if (column[y] != null) {
                        contexto.fillStyle = cores[column[y]];
                        var bp = transfromaPosicaoBloco(x, y);
                        desenhaBloco(bp.x, bp.y);
                    }
                }
            }
        };

        var desenhaBloco = function (x, y) {
            contexto.strokeStyle = "#FFFFFF";
            contexto.lineWidth = 4;
            contexto.strokeRect(x, y, tamanhoBloco.l, tamanhoBloco.a);
            contexto.fillRect(x, y, tamanhoBloco.l, tamanhoBloco.a);
        };

        var atualizaTamanhoBloco = function () {
            tamanhoBloco = {l: (tamanhaCanvas.l / tamanhoGrade.l), a: (tamanhaCanvas.a / tamanhoGrade.a)};
        };

        var atualizaTamanhoCanvas = function () {
            tamanhaCanvas = {l: $(canvas).width(), a: $(canvas).height()};
            atualizaTamanhoBloco();
        };

        var novoJogo = function () {
            $(canvas).unbind("click");
            $(canvas).one("click", onCanvasClick);
            setDestroyHover(true);
            jogo.Grade.geraGrade(tamanhoGrade.l, tamanhoGrade.a, numeroCores);
            desenhaBlocos();
        };

        var fimJogo = function () {
            setDestroyHover(false);
            contexto.fillStyle = "#000000";
            contexto.font = "bold 40px serif";
            contexto.textBaseline = "middle";
            var text = (jogo.Grade.obtemColunas().length == 0 ? "Você venceu!" : "você perdeu!");
            contexto.fillText(text, (tamanhaCanvas.l - contexto.measureText(text).width) / 2, tamanhaCanvas.a / 2);
            setCursor(true);
            $(canvas).one("click", novoJogo);
        };

        return {
            iniciar: function () {
                canvas = $("#jogoCanvas")[0];
                contexto = canvas.getContext("2d");

                atualizaTamanhoCanvas();
                $(window).resize(function () {
                    atualizaTamanhoCanvas();
                    desenhaBlocos();
                });

                bindHover();

                novoJogo();
            },

            getBrickSize: function () {
                return tamanhoBloco;
            },

            getGridSize: function () {
                return tamanhoGrade;
            }
        };
    }();

    $(document).ready(jogo.Canvas.iniciar);

}());
