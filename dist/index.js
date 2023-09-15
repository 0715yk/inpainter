var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Konva from "konva";
import { dataURItoBlob, getContainSize, getDrawCursor, EventListeners, convertBlackToTransparent, } from "./libs";
const inpainter = (function () {
    const output = {
        width: 0,
        height: 0,
        image: null,
    };
    let history = [];
    let historyStep = 0;
    const brushOptions = {
        strokeWidth: 30,
    };
    let drawingModeOn = false;
    let drawingMode = "brush";
    let scale = 1;
    let stage = null;
    let drawLayer = null;
    let imageLayer = null;
    let currentLine = null;
    let drawRect = null;
    const containerSizeOption = { width: null, height: null };
    const eventListener = new EventListeners();
    return {
        goTo(index) {
            if (drawLayer === null)
                return;
            history = history.filter((line, _) => {
                if (_ >= index) {
                    line === null || line === void 0 ? void 0 : line.remove();
                    return false;
                }
                else {
                    return true;
                }
            });
            drawLayer.batchDraw();
            historyStep = index;
            eventListener.dispatch("change", {
                cnt: historyStep,
                stage: stage === null || stage === void 0 ? void 0 : stage.toJSON(),
            });
        },
        undo() {
            if (historyStep === 0) {
                return;
            }
            historyStep--;
            const lineToRemove = history[historyStep];
            if (lineToRemove !== undefined && drawLayer !== null) {
                lineToRemove.remove();
                drawLayer.batchDraw();
                eventListener.dispatch("change", {
                    cnt: historyStep,
                    stage: stage === null || stage === void 0 ? void 0 : stage.toJSON(),
                });
            }
        },
        redo() {
            if (historyStep === history.length || drawRect === null) {
                return;
            }
            const lineToRedraw = history[historyStep];
            if (lineToRedraw !== undefined && drawLayer !== null) {
                drawLayer.add(lineToRedraw);
                const ifDrawRectExist = drawLayer.findOne("#drawRect");
                if (ifDrawRectExist)
                    drawRect.remove();
                drawLayer.add(drawRect);
                historyStep++;
                eventListener.dispatch("change", {
                    cnt: historyStep,
                    stage: stage === null || stage === void 0 ? void 0 : stage.toJSON(),
                });
            }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        on(eventType, eventCallback) {
            eventListener.addEventListener(eventType, eventCallback);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        off(eventType, eventCallback) {
            eventListener.removeEventListener(eventType, eventCallback);
        },
        init: function ({ container, brushOption, width, height, on, cache, patternSrc, containerSize, }) {
            var _a;
            if (cache) {
                stage = Konva.Node.create(cache, container);
                const iLayer = stage.findOne("#imageLayer");
                const dLayer = stage.findOne("#drawLayer");
                imageLayer = iLayer;
                drawLayer = dLayer;
            }
            else {
                stage = new Konva.Stage({
                    container,
                    width,
                    height,
                });
                imageLayer = new Konva.Layer({
                    id: "imageLayer",
                });
                drawLayer = new Konva.Layer({
                    id: "drawLayer",
                });
                stage.add(imageLayer);
                stage.add(drawLayer);
            }
            let isPaint = false;
            if (brushOption) {
                brushOptions.strokeWidth = brushOption.strokeWidth;
            }
            containerSizeOption.width = containerSize.width;
            containerSizeOption.height = containerSize.height;
            stage.on("mousedown", () => {
                if (!drawingModeOn)
                    return;
                isPaint = true;
                if (stage !== null && drawRect !== null) {
                    const pointerPosition = stage.getPointerPosition();
                    if (drawLayer !== null && pointerPosition !== null) {
                        const x = (pointerPosition.x - drawLayer.x()) / scale;
                        const y = (pointerPosition.y - drawLayer.y()) / scale;
                        const minValue = 0.0001;
                        currentLine = new Konva.Line({
                            stroke: "#FFFFFF",
                            strokeWidth: (brushOptions === null || brushOptions === void 0 ? void 0 : brushOptions.strokeWidth) / scale,
                            globalCompositeOperation: drawingMode === "brush" ? "source-over" : "destination-out",
                            lineCap: "round",
                            lineJoin: "round",
                            points: [x, y, x + minValue, y + minValue],
                        });
                        drawLayer.add(currentLine);
                        const ifDrawRectExist = drawLayer.findOne("#drawRect");
                        if (ifDrawRectExist)
                            drawRect.remove();
                        drawLayer.add(drawRect);
                    }
                }
            });
            stage.on("mousemove", ({ evt }) => {
                if (!drawingModeOn)
                    return;
                if (!isPaint)
                    return;
                evt.preventDefault();
                if (stage !== null) {
                    const pointerPosition = stage.getPointerPosition();
                    if (drawLayer !== null && pointerPosition !== null) {
                        const x = (pointerPosition.x - drawLayer.x()) / scale;
                        const y = (pointerPosition.y - drawLayer.y()) / scale;
                        if (currentLine !== null) {
                            currentLine.points(currentLine.points().concat([x, y]));
                        }
                    }
                }
            });
            stage.on("mouseup", () => {
                if (!drawingModeOn)
                    return;
                if (!isPaint)
                    return;
                isPaint = false;
                if (currentLine !== null) {
                    history = history.slice(0, historyStep);
                    history.push(currentLine);
                    historyStep++;
                    eventListener.dispatch("change", {
                        cnt: historyStep,
                        stage: stage === null || stage === void 0 ? void 0 : stage.toJSON(),
                    });
                }
            });
            if (on !== undefined) {
                Object.keys(on).forEach((eventName) => {
                    eventListener.addEventListener(eventName, on[eventName]);
                });
            }
            if (container instanceof HTMLDivElement) {
                const divElement = container.firstChild;
                divElement === null || divElement === void 0 ? void 0 : divElement.addEventListener("mouseleave", function () {
                    if (!isPaint)
                        return;
                    if (!drawingModeOn)
                        return;
                    isPaint = false;
                    if (currentLine !== null) {
                        history = history.slice(0, historyStep + 1);
                        history.push(currentLine);
                        historyStep++;
                        eventListener.dispatch("change", {
                            cnt: historyStep,
                            stage: stage === null || stage === void 0 ? void 0 : stage.toJSON(),
                        });
                    }
                });
            }
            else {
                const divElement = (_a = document.querySelector(container)) === null || _a === void 0 ? void 0 : _a.firstChild;
                divElement === null || divElement === void 0 ? void 0 : divElement.addEventListener("mouseleave", function () {
                    if (!isPaint)
                        return;
                    if (!drawingModeOn)
                        return;
                    isPaint = false;
                    if (currentLine !== null) {
                        history = history.slice(0, historyStep + 1);
                        history.push(currentLine);
                        historyStep++;
                        eventListener.dispatch("change", {
                            cnt: historyStep,
                            stage: stage === null || stage === void 0 ? void 0 : stage.toJSON(),
                        });
                    }
                });
            }
            const img = new Image();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.src = patternSrc;
            }).then(() => {
                if (drawLayer === null)
                    return;
                drawRect = new Konva.Rect({
                    fillPatternImage: img,
                    id: "drawRect",
                    fillPatternRepeat: "no-repeat",
                    globalCompositeOperation: "source-in",
                    fillPriority: "pattern",
                });
                drawLayer.add(drawRect);
                return true;
            });
        },
        importImage({ src, selectedWidth, selectedHeight, maskSrc, }) {
            const imageElement = new Image();
            const { width: containerWidth, height: containerHeight } = containerSizeOption;
            if (containerWidth === null || containerHeight === null)
                return;
            imageElement.onload = () => __awaiter(this, void 0, void 0, function* () {
                if (stage === null ||
                    imageLayer === null ||
                    drawLayer === null ||
                    drawRect === null)
                    return;
                const { width: stageW, height: stageH } = getContainSize(containerWidth, containerHeight, selectedWidth, selectedHeight);
                stage.width(stageW);
                stage.height(stageH);
                const { width: imageW, height: imageH } = imageElement;
                const stageRatio = stageW / stageH;
                const imageRatio = imageW / imageH;
                let width = stageW;
                let height = stageH;
                let x = 0;
                let y = 0;
                if (stageRatio < imageRatio) {
                    width = stageH * imageRatio;
                    x = (stageW - width) / 2;
                }
                else if (stageRatio > imageRatio) {
                    height = stageW / imageRatio;
                    y = (stageH - height) / 2;
                }
                scale = stageRatio < imageRatio ? stageH / imageH : stageW / imageW;
                imageLayer.removeChildren();
                imageLayer.add(new Konva.Image({ image: imageElement, width, height, x, y }));
                const copyDiv = document.createElement("div");
                copyDiv.id = "app";
                document.body.appendChild(copyDiv);
                const copyStage = new Konva.Stage({
                    container: "app",
                    width: stageW,
                    height: stageH,
                });
                copyStage.add(imageLayer.clone());
                const base64 = copyStage.toCanvas().toDataURL("image/png", 0);
                Object.assign(output, {
                    width: selectedWidth,
                    height: selectedHeight,
                    image: base64,
                });
                copyDiv.remove();
                copyStage.remove();
                drawLayer.position({ x, y });
                drawLayer.scale({ x: scale, y: scale });
                drawLayer.moveToTop();
                drawRect.x(-(drawLayer.x() / scale));
                drawRect.y(-(drawLayer.y() / scale));
                drawRect.fillPatternScaleX(1 / scale);
                drawRect.fillPatternScaleY(1 / scale);
                drawRect.width(drawLayer.width() * (1 / scale));
                drawRect.height(drawLayer.height() * (1 / scale));
                if (maskSrc) {
                    const response = yield convertBlackToTransparent(maskSrc);
                    if (response === undefined)
                        return;
                    const image = new Image();
                    image.onload = () => {
                        if (drawLayer === null || drawRect === null)
                            return;
                        const imageKonva = new Konva.Image({
                            image: image,
                        });
                        drawLayer.add(imageKonva);
                        const ifDrawRectExist = drawLayer.findOne("#drawRect");
                        if (ifDrawRectExist)
                            drawRect.remove();
                        drawLayer.add(drawRect);
                    };
                    image.src = response;
                }
            });
            imageElement.src = src;
        },
        setStrokeWidth(width) {
            if (typeof width === "string") {
                brushOptions.strokeWidth = parseInt(width);
            }
            else {
                brushOptions.strokeWidth = width;
            }
            if (!drawingModeOn)
                return;
            if (stage !== null) {
                stage.container().style.cursor = getDrawCursor(brushOptions.strokeWidth);
            }
        },
        setDrawingMode(mode) {
            if (stage !== null && drawLayer !== null) {
                if (mode === "off") {
                    drawLayer.hide();
                    drawingModeOn = false;
                    stage.container().style.cursor = "not-allowed";
                    return;
                }
                else if (mode === "on") {
                    this.setDrawingMode(drawingMode);
                    return;
                }
                else if (mode === "eraser") {
                    drawingModeOn = true;
                    drawLayer.show();
                    if (stage !== null) {
                        stage.container().style.cursor = getDrawCursor(brushOptions.strokeWidth);
                    }
                }
                else if (mode === "brush") {
                    drawingModeOn = true;
                    drawLayer.show();
                    if (stage !== null) {
                        stage.container().style.cursor = getDrawCursor(brushOptions.strokeWidth);
                    }
                }
                drawingMode = mode;
            }
        },
        deleteImage() {
            if (drawLayer !== null && imageLayer !== null) {
                drawLayer.destroyChildren();
                imageLayer.destroyChildren();
                history = [];
                historyStep = 0;
            }
        },
        exportMask() {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            const foreground = new Image();
            canvas.width = output.width;
            canvas.height = output.height;
            return new Promise((resolve) => {
                var _a;
                foreground.onload = resolve;
                if (stage !== null) {
                    const copyStage = stage.clone();
                    copyStage.container().style.backgroundColor = "black";
                    const copyImageLayer = copyStage.findOne("#imageLayer");
                    copyImageLayer.hide();
                    const copyDrawLayer = copyStage.findOne("#drawLayer");
                    copyDrawLayer.show();
                    (_a = copyDrawLayer.children) === null || _a === void 0 ? void 0 : _a.forEach((el) => {
                        if (el.id() === "drawRect") {
                            el.destroy();
                        }
                    });
                    foreground.src = copyStage.toDataURL({ pixelRatio: 2 });
                }
            }).then(() => {
                if (context !== null) {
                    context.drawImage(foreground, 0, 0, output.width, output.height);
                    const drawingCanvas = canvas;
                    if (drawingCanvas !== undefined) {
                        const context = drawingCanvas.getContext("2d");
                        if (context !== null) {
                            context.globalCompositeOperation = "source-in";
                            context.fillStyle = "white";
                            context.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
                            context.drawImage(drawingCanvas, 0, 0);
                            const imgData = context.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
                            for (let i = 0; i < imgData.data.length; i += 4) {
                                const count = imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2];
                                let colour = 0;
                                if (count > 383)
                                    colour = 255;
                                imgData.data[i] = colour;
                                imgData.data[i + 1] = colour;
                                imgData.data[i + 2] = colour;
                                imgData.data[i + 3] = 255;
                            }
                            context.putImageData(imgData, 0, 0);
                            const pngURL = drawingCanvas.toDataURL("image/png");
                            return dataURItoBlob(pngURL);
                        }
                    }
                }
            });
        },
        exportImage() {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            const foreground = new Image();
            canvas.width = output.width;
            canvas.height = output.height;
            return new Promise((resolve) => {
                if (stage === null)
                    return;
                foreground.onload = resolve;
                const copyStage = stage.clone();
                const copyDrawLayer = copyStage.findOne("#drawLayer");
                copyDrawLayer.hide();
                foreground.src = copyStage.toDataURL({ pixelRatio: 2 });
            }).then(() => {
                if (context !== null) {
                    context.drawImage(foreground, 0, 0, output.width, output.height);
                    return dataURItoBlob(canvas.toDataURL("image/png"));
                }
            });
        },
        getCenterCroppedImage({ src, selectedWidth, selectedHeight, }) {
            const imageElement = new Image();
            const { width: containerWidth, height: containerHeight } = containerSizeOption;
            return new Promise((resolve) => {
                imageElement.onload = resolve;
                imageElement.src = src;
            }).then(() => {
                if (stage === null ||
                    containerWidth === null ||
                    containerHeight === null) {
                    return;
                }
                const { width: stageW, height: stageH } = getContainSize(containerWidth, containerHeight, selectedWidth, selectedHeight);
                stage.width(stageW);
                stage.height(stageH);
                const { width: imageW, height: imageH } = imageElement;
                const stageRatio = stageW / stageH;
                const imageRatio = imageW / imageH;
                let width = stageW;
                let height = stageH;
                let x = 0;
                let y = 0;
                if (stageRatio < imageRatio) {
                    width = stageH * imageRatio;
                    x = (stageW - width) / 2;
                }
                else if (stageRatio > imageRatio) {
                    height = stageW / imageRatio;
                    y = (stageH - height) / 2;
                }
                scale = stageRatio < imageRatio ? stageH / imageH : stageW / imageW;
                return new Konva.Image({ image: imageElement, width, height, x, y });
            });
        },
    };
})();
export default inpainter;
