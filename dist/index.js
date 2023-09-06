import Konva from "konva";
import { dataURItoBlob, getContainSize, getDrawCursor } from "./libs";
const imagePrompt = (function () {
    const output = {
        width: 0,
        height: 0,
        image: null,
    };
    const undoStack = [];
    const redoStack = [];
    const brushOptions = {
        strokeWidth: 30,
        color: "#ffffff",
    };
    let drawingModeOn = false;
    let drawingMode = "brush";
    let scale = 1;
    let stage = null;
    let drawLayer = null;
    let imageLayer = null;
    let currentLine = null;
    return {
        undo() {
            if (undoStack.length > 0) {
                const lineToRemove = undoStack.pop();
                if (lineToRemove !== undefined && drawLayer !== null) {
                    redoStack.push(lineToRemove);
                    lineToRemove.destroy();
                    drawLayer.batchDraw();
                }
            }
        },
        redo() {
            if (redoStack.length > 0) {
                const lineToRedraw = redoStack.pop();
                if (lineToRedraw !== undefined && drawLayer !== null) {
                    undoStack.push(lineToRedraw);
                    drawLayer.add(lineToRedraw);
                    drawLayer.batchDraw();
                }
            }
        },
        init: function ({ container, brushOption, width, height, }) {
            stage = new Konva.Stage({
                container,
                width,
                height,
            });
            imageLayer = new Konva.Layer();
            drawLayer = new Konva.Layer({
                id: "drawLayer",
            });
            stage.add(imageLayer);
            stage.add(drawLayer);
            let isPaint = false;
            if (brushOption) {
                brushOptions.color = brushOption.color;
                brushOptions.strokeWidth = brushOption.strokeWidth;
            }
            stage.on("mousedown", () => {
                if (!drawingModeOn)
                    return;
                isPaint = true;
                if (stage !== null) {
                    const pointerPosition = stage.getPointerPosition();
                    if (drawLayer !== null && pointerPosition !== null) {
                        const x = (pointerPosition.x - drawLayer.x()) / scale;
                        const y = (pointerPosition.y - drawLayer.y()) / scale;
                        currentLine = new Konva.Line({
                            stroke: brushOptions === null || brushOptions === void 0 ? void 0 : brushOptions.color,
                            strokeWidth: (brushOptions === null || brushOptions === void 0 ? void 0 : brushOptions.strokeWidth) / scale,
                            globalCompositeOperation: drawingMode === "brush" ? "source-over" : "destination-out",
                            lineCap: "round",
                            lineJoin: "round",
                            points: [x, y, x, y],
                        });
                        drawLayer.add(currentLine);
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
                isPaint = false;
                redoStack.length = 0;
                if (currentLine !== null) {
                    undoStack.push(currentLine);
                }
            });
            const divElement = document.querySelector(container);
            divElement === null || divElement === void 0 ? void 0 : divElement.addEventListener("mouseout", function () {
                if (!drawingModeOn)
                    return;
                isPaint = false;
                redoStack.length = 0;
                if (currentLine !== null) {
                    undoStack.push(currentLine);
                }
            });
        },
        importImage({ src, containerWidth, containerHeight, selectedWidth, selectedHeight, }) {
            const imageElement = new Image();
            imageElement.onload = () => {
                if (stage === null || imageLayer === null || drawLayer === null)
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
                imageLayer.destroyChildren();
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
            };
            imageElement.src = src;
        },
        exportImage() {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            const foreground = new Image();
            canvas.width = output.width;
            canvas.height = output.height;
            return new Promise((resolve) => {
                foreground.onload = resolve;
                if (stage !== null) {
                    const copyStage = stage.clone();
                    const copyDrawLayer = copyStage.findOne("#drawLayer");
                    copyDrawLayer.show();
                    foreground.src = copyStage.toDataURL({ pixelRatio: 2 });
                }
            }).then(() => {
                if (stage !== null && context !== null) {
                    context.drawImage(foreground, 0, 0, output.width, output.height);
                    return dataURItoBlob(canvas.toDataURL("image/png"));
                }
            });
        },
        setStrokeColor(color) {
            brushOptions.color = color;
            if (!drawingModeOn || drawingMode === "eraser")
                return;
            if (stage !== null && brushOptions.strokeWidth !== null) {
                stage.container().style.cursor = getDrawCursor(brushOptions.strokeWidth, color, drawingMode === "brush" ? color : undefined);
            }
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
            if (stage !== null && brushOptions.color !== null) {
                stage.container().style.cursor = getDrawCursor(brushOptions.strokeWidth, drawingMode === "eraser" ? "none" : brushOptions.color, drawingMode === "brush" ? brushOptions.color : undefined);
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
                        stage.container().style.cursor = getDrawCursor(brushOptions.strokeWidth, "none");
                    }
                }
                else if (mode === "brush") {
                    drawingModeOn = true;
                    drawLayer.show();
                    if (stage !== null) {
                        stage.container().style.cursor = getDrawCursor(brushOptions.strokeWidth, brushOptions.color, brushOptions.color);
                    }
                }
                drawingMode = mode;
            }
        },
        deleteImage() {
            if (drawLayer !== null && imageLayer !== null) {
                drawLayer.destroyChildren();
                imageLayer.destroyChildren();
                undoStack.length = 0;
                redoStack.length = 0;
            }
        },
    };
})();
export default imagePrompt;
