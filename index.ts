import Konva from "konva";
import { dataURItoBlob, getContainSize, getDrawCursor } from "./libs";

const imagePrompt = (function () {
  // 컨테인 방식으로 사이즈 반환
  const output = {
    width: 0,
    height: 0,
    image: null,
  };
  const undoStack: Konva.Line[] = [];
  const redoStack: Konva.Line[] = [];
  const brushOptions = {
    strokeWidth: 30,
    color: "#ffffff",
  } as { strokeWidth: number; color: string };

  let drawingModeOn = false;
  let drawingMode = "brush";
  let scale = 1;
  let stage = null as null | Konva.Stage;
  let drawLayer = null as null | Konva.Layer;
  let imageLayer = null as null | Konva.Layer;
  let currentLine: Konva.Line | null = null;

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
    init: function ({
      id,
      brushOption,
      width,
      height,
    }: {
      id: string;
      brushOption?: { strokeWidth: number; color: string };
      width?: number;
      height?: number;
    }) {
      stage = new Konva.Stage({
        container: id,
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
        if (!drawingModeOn) return;
        isPaint = true;
        if (stage !== null) {
          const pointerPosition = stage.getPointerPosition();
          if (drawLayer !== null && pointerPosition !== null) {
            const x = (pointerPosition.x - drawLayer.x()) / scale;
            const y = (pointerPosition.y - drawLayer.y()) / scale;

            currentLine = new Konva.Line({
              stroke: brushOptions?.color,
              strokeWidth: brushOptions?.strokeWidth / scale,
              globalCompositeOperation:
                drawingMode === "brush" ? "source-over" : "destination-out",
              lineCap: "round",
              lineJoin: "round",
              points: [x, y, x, y],
            });

            drawLayer.add(currentLine);
          }
        }
      });

      stage.on("mousemove", ({ evt }) => {
        if (!drawingModeOn) return;
        if (!isPaint) return;

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
        if (!drawingModeOn) return;
        isPaint = false;
        redoStack.length = 0;
        if (currentLine !== null) {
          undoStack.push(currentLine);
        }
      });
    },

    // 이미지 불러오기
    importImage({
      src,
      containerWidth,
      containerHeight,
      selectedWidth,
      selectedHeight,
    }: {
      src: string;
      containerWidth: number;
      containerHeight: number;
      selectedWidth: number;
      selectedHeight: number;
    }) {
      const imageElement = new Image();

      imageElement.onload = () => {
        if (stage === null || imageLayer === null || drawLayer === null) return;
        const { width: stageW, height: stageH } = getContainSize(
          containerWidth,
          containerHeight,
          selectedWidth,
          selectedHeight
        );

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
          // 이미지 높이를 스테이지 높이에 맞추고, 비율에 따라 늘어난 이미지 너비를 크롭
          width = stageH * imageRatio;
          x = (stageW - width) / 2;
        } else if (stageRatio > imageRatio) {
          // 이미지 너비를 스테이지 너비에 맞추고, 비율에 따라 늘어난 높이를 크롭
          height = stageW / imageRatio;
          y = (stageH - height) / 2;
        }

        scale = stageRatio < imageRatio ? stageH / imageH : stageW / imageW;

        imageLayer.destroyChildren();
        imageLayer.add(
          new Konva.Image({ image: imageElement, width, height, x, y })
        );
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
    setStrokeColor(color: string) {
      brushOptions.color = color;
      if (!drawingModeOn || drawingMode === "eraser") return;
      if (stage !== null && brushOptions.strokeWidth !== null) {
        stage.container().style.cursor = getDrawCursor(
          brushOptions.strokeWidth,
          color,
          drawingMode === "brush" ? color : undefined
        );
      }
    },
    setStrokeWidth(width: number | string) {
      if (typeof width === "string") {
        brushOptions.strokeWidth = parseInt(width);
      } else {
        brushOptions.strokeWidth = width;
      }
      if (!drawingModeOn) return;
      if (stage !== null && brushOptions.color !== null) {
        stage.container().style.cursor = getDrawCursor(
          brushOptions.strokeWidth,
          drawingMode === "eraser" ? "none" : brushOptions.color,
          drawingMode === "brush" ? brushOptions.color : undefined
        );
      }
    },
    setDrawingMode(mode: string) {
      if (stage !== null) {
        if (mode === "edit") {
          drawingModeOn = false;
          stage.container().style.cursor = "default";
          return;
        } else if (mode === "visibility") {
          stage.container().style.cursor = "not-allowed";
        }
        drawingModeOn = true;
        drawingMode = mode;
        if (mode === "eraser") {
          if (stage !== null && drawingModeOn) {
            stage.container().style.cursor = getDrawCursor(
              brushOptions.strokeWidth,
              "none"
            );
          }
        } else if (mode === "brush") {
          if (stage !== null && drawingModeOn) {
            stage.container().style.cursor = getDrawCursor(
              brushOptions.strokeWidth,
              brushOptions.color,
              brushOptions.color
            );
          }
        }
      }
    },
    setVisibility(status: boolean) {
      if (drawLayer !== null) {
        if (status) {
          drawLayer.show();
        } else {
          drawLayer.hide();
        }
        this.setDrawLayer(status);
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
    changeImage() {
      if (drawLayer !== null && imageLayer !== null) {
        drawLayer.destroyChildren();
        imageLayer.destroyChildren();
        undoStack.length = 0;
        redoStack.length = 0;
      }
    },
    setDrawLayer: function (status: boolean) {
      if (status) {
        let isPaint = false;
        if (stage !== null) {
          stage.on("mousedown", () => {
            if (!drawingModeOn) return;
            isPaint = true;
            if (stage !== null) {
              const pointerPosition = stage.getPointerPosition();
              if (pointerPosition !== null && drawLayer !== null) {
                const x = (pointerPosition.x - drawLayer.x()) / scale;
                const y = (pointerPosition.y - drawLayer.y()) / scale;

                currentLine = new Konva.Line({
                  stroke: brushOptions?.color,
                  strokeWidth: brushOptions?.strokeWidth / scale,
                  globalCompositeOperation:
                    drawingMode === "brush" ? "source-over" : "destination-out",
                  lineCap: "round",
                  lineJoin: "round",
                  points: [x, y, x, y],
                });
                if (currentLine !== null) {
                  drawLayer.add(currentLine);
                }
              }
            }
          });

          stage.on("mousemove", ({ evt }) => {
            if (!drawingModeOn) return;
            if (!isPaint) return;
            if (stage === null) return;
            evt.preventDefault();
            const pointerPosition = stage.getPointerPosition();
            if (pointerPosition !== null && drawLayer !== null) {
              const x = (pointerPosition.x - drawLayer.x()) / scale;
              const y = (pointerPosition.y - drawLayer.y()) / scale;
              if (currentLine !== null) {
                currentLine.points(currentLine.points().concat([x, y]));
              }
            }
          });

          stage.on("mouseup", () => {
            if (!drawingModeOn) return;
            isPaint = false;
          });
        }
      } else {
        if (stage !== null) {
          stage.off("mousedown");
          stage.off("mousemove");
          stage.off("mouseup");
        }
      }
    },
  };
})();
export default imagePrompt;
