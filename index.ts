import Konva from "konva";
import {
  dataURItoBlob,
  getContainSize,
  getDrawCursor,
  EventListeners,
  loadImage,
} from "./libs";

const inpainter = (function () {
  const output = {
    width: 0,
    height: 0,
    image: null,
  };
  let history: Konva.Line[] = [];
  let historyStep = 0;

  const brushOptions = {
    strokeWidth: 30,
  } as { strokeWidth: number };

  let drawingModeOn = false;
  let drawingMode: "brush" | "eraser" | "on" | "off" = "brush";
  let scale = 1;
  let stage = null as null | Konva.Stage;
  let drawLayer = null as null | Konva.Layer;
  let imageLayer = null as null | Konva.Layer;
  let currentLine: Konva.Line | null = null;
  let drawRect: Konva.Rect | null = null;

  const containerSizeOption: {
    width: null | number;
    height: null | number;
  } = { width: null, height: null };

  const eventListener = new EventListeners();

  return {
    getStage() {
      return stage;
    },
    goTo(index: number) {
      if (drawLayer === null) return;

      history = history.filter((line, _) => {
        if (_ >= index) {
          line?.remove();
          return false;
        } else {
          return true;
        }
      });
      drawLayer.batchDraw();
      historyStep = index;
      eventListener.dispatch("change", {
        cnt: historyStep,
        stage: stage?.toJSON(),
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
          stage: stage?.toJSON(),
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
        if (ifDrawRectExist) drawRect.remove();
        drawLayer.add(drawRect);

        historyStep++;

        eventListener.dispatch("change", {
          cnt: historyStep,
          stage: stage?.toJSON(),
        });
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(eventType: string, eventCallback: (...args: any) => void) {
      eventListener.addEventListener(eventType, eventCallback);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    off(eventType: string, eventCallback: (...args: any) => void) {
      eventListener.removeEventListener(eventType, eventCallback);
    },

    init: function ({
      container,
      brushOption,
      width,
      height,
      on,
      cache,
      patternSrc,
      containerSize,
    }: {
      container: string | HTMLDivElement;
      brushOption?: { strokeWidth: number };
      width?: number;
      height?: number;
      on?: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [eventType: string]: (arg: any) => void;
      };
      cache?: string;
      patternSrc: string;
      containerSize: {
        width: null | number;
        height: null | number;
      };
    }) {
      if (cache) {
        stage = Konva.Node.create(cache, container) as Konva.Stage;
        const iLayer = stage.findOne("#imageLayer") as Konva.Layer;
        const dLayer = stage.findOne("#drawLayer") as Konva.Layer;

        imageLayer = iLayer;
        drawLayer = dLayer;
      } else {
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
        if (!drawingModeOn) return;
        isPaint = true;

        if (stage !== null && drawRect !== null) {
          const pointerPosition = stage.getPointerPosition();
          if (drawLayer !== null && pointerPosition !== null) {
            const x = (pointerPosition.x - drawLayer.x()) / scale;
            const y = (pointerPosition.y - drawLayer.y()) / scale;
            const minValue = 0.0001;

            currentLine = new Konva.Line({
              stroke: "#FFFFFF",
              strokeWidth: brushOptions?.strokeWidth / scale,
              globalCompositeOperation:
                drawingMode === "brush" ? "source-over" : "destination-out",
              lineCap: "round",
              lineJoin: "round",
              points: [x, y, x + minValue, y + minValue],
            });
            drawLayer.add(currentLine);

            const ifDrawRectExist = drawLayer.findOne("#drawRect");
            if (ifDrawRectExist) drawRect.remove();
            drawLayer.add(drawRect);
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
        if (!isPaint) return;

        isPaint = false;

        if (currentLine !== null) {
          history = history.slice(0, historyStep);
          history.push(currentLine);
          historyStep++;
          eventListener.dispatch("change", {
            cnt: historyStep,
            stage: stage?.toJSON(),
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
        divElement?.addEventListener("mouseleave", function () {
          if (!isPaint) return;
          if (!drawingModeOn) return;

          isPaint = false;

          if (currentLine !== null) {
            history = history.slice(0, historyStep + 1);
            history.push(currentLine);
            historyStep++;
            eventListener.dispatch("change", {
              cnt: historyStep,
              stage: stage?.toJSON(),
            });
          }
        });
      } else {
        const divElement = document.querySelector(container)?.firstChild;
        divElement?.addEventListener("mouseleave", function () {
          if (!isPaint) return;
          if (!drawingModeOn) return;

          isPaint = false;

          if (currentLine !== null) {
            history = history.slice(0, historyStep + 1);
            history.push(currentLine);
            historyStep++;
            eventListener.dispatch("change", {
              cnt: historyStep,
              stage: stage?.toJSON(),
            });
          }
        });
      }

      const img = new Image();

      return new Promise((resolve) => {
        img.onload = resolve;
        img.src = patternSrc;
      }).then(() => {
        if (drawLayer === null) return;
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
    async importImage({
      src,
      selectedWidth,
      selectedHeight,
      maskSrc,
    }: {
      src: string;
      selectedWidth: number;
      selectedHeight: number;
      maskSrc?: string;
    }) {
      const { width: containerWidth, height: containerHeight } =
        containerSizeOption;

      if (containerWidth === null || containerHeight === null) return;

      const imageElement = (await loadImage(src)) as HTMLImageElement;

      if (
        stage === null ||
        imageLayer === null ||
        drawLayer === null ||
        drawRect === null
      )
        return;
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
        width = stageH * imageRatio;
        x = (stageW - width) / 2;
      } else if (stageRatio > imageRatio) {
        height = stageW / imageRatio;
        y = (stageH - height) / 2;
      }

      scale = stageRatio < imageRatio ? stageH / imageH : stageW / imageW;

      imageLayer.removeChildren();
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

      drawRect.x(-(drawLayer.x() / scale));
      drawRect.y(-(drawLayer.y() / scale));

      drawRect.fillPatternScaleX(1 / scale);
      drawRect.fillPatternScaleY(1 / scale);
      drawRect.width(drawLayer.width() * (1 / scale));
      drawRect.height(drawLayer.height() * (1 / scale));

      if (maskSrc) {
        const image = (await loadImage(maskSrc)) as HTMLImageElement;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context === null) return;
        canvas.width = image.width;
        canvas.height = image.height;

        context.drawImage(image, 0, 0);

        const imgData = context.getImageData(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < imgData.data.length; i += 4) {
          const red = imgData.data[i];
          const green = imgData.data[i + 1];
          const blue = imgData.data[i + 2];

          // 검정색 픽셀인 경우 투명하게 처리합니다.
          if (red === 0 && green === 0 && blue === 0) {
            imgData.data[i + 3] = 0; // Alpha 값을 0으로 설정하여 투명 처리
          }
        }

        context.putImageData(imgData, 0, 0);

        const transparentImageUrl = canvas.toDataURL() as string;

        const imageEl = (await loadImage(
          transparentImageUrl
        )) as HTMLImageElement;

        const imageKonva = new Konva.Image({
          image: imageEl,
        });
        drawLayer.add(imageKonva);
        const ifDrawRectExist = drawLayer.findOne("#drawRect");
        if (ifDrawRectExist) drawRect.remove();
        console.log(drawRect);
        drawLayer.add(drawRect);

        return true;
      } else {
        return null;
      }
    },
    setStrokeWidth(width: number | string) {
      if (typeof width === "string") {
        brushOptions.strokeWidth = parseInt(width);
      } else {
        brushOptions.strokeWidth = width;
      }
      if (!drawingModeOn) return;
      if (stage !== null) {
        stage.container().style.cursor = getDrawCursor(
          brushOptions.strokeWidth
        );
      }
    },
    setDrawingMode(mode: "brush" | "eraser" | "on" | "off") {
      if (stage !== null && drawLayer !== null) {
        if (mode === "off") {
          drawLayer.hide();
          drawingModeOn = false;
          stage.container().style.cursor = "not-allowed";
          return;
        } else if (mode === "on") {
          this.setDrawingMode(drawingMode);
          return;
        } else if (mode === "eraser") {
          drawingModeOn = true;
          drawLayer.show();
          if (stage !== null) {
            stage.container().style.cursor = getDrawCursor(
              brushOptions.strokeWidth
            );
          }
        } else if (mode === "brush") {
          drawingModeOn = true;
          drawLayer.show();
          if (stage !== null) {
            stage.container().style.cursor = getDrawCursor(
              brushOptions.strokeWidth
            );
          }
        }

        drawingMode = mode;
      }
    },
    deleteImage() {
      if (drawLayer !== null && imageLayer !== null) {
        drawLayer.removeChildren();
        imageLayer.removeChildren();
        history = [];
        historyStep = 0;
      }
    },
    async exportMask() {
      if (stage === null) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = output.width;
      canvas.height = output.height;

      const copyStage = stage.clone();
      copyStage.container().style.backgroundColor = "black";
      const copyImageLayer = copyStage.findOne("#imageLayer");
      copyImageLayer.hide();
      const copyDrawLayer = copyStage.findOne("#drawLayer") as Konva.Layer;
      copyDrawLayer.show();
      copyDrawLayer?.children?.forEach((el) => {
        if (el.id() === "drawRect") {
          el.remove();
        }
      });

      const pngURL = copyStage.toDataURL({ pixelRatio: 2 });
      const imageElement = await loadImage(pngURL);
      if (context !== null) {
        context.drawImage(imageElement, 0, 0, output.width, output.height);
        const drawingCanvas = canvas;
        if (drawingCanvas !== undefined) {
          const context = drawingCanvas.getContext("2d");
          if (context !== null) {
            context.globalCompositeOperation = "source-in";
            context.fillStyle = "white";
            context.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            context.drawImage(drawingCanvas, 0, 0);

            const imgData = context.getImageData(
              0,
              0,
              drawingCanvas.width,
              drawingCanvas.height
            );

            for (let i = 0; i < imgData.data.length; i += 4) {
              const count =
                imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2];
              let colour = 0;
              if (count > 383) colour = 255;

              imgData.data[i] = colour;
              imgData.data[i + 1] = colour;
              imgData.data[i + 2] = colour;
              imgData.data[i + 3] = 255;
            }

            context.putImageData(imgData, 0, 0);
            const pngURL = drawingCanvas.toDataURL("image/png");
            return pngURL;
          }
        }
      }
    },
    async exportImage() {
      if (stage === null) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = output.width;
      canvas.height = output.height;
      const copyStage = stage.clone();
      const copyDrawLayer = copyStage.findOne("#drawLayer");
      copyDrawLayer.hide();
      const pngURL = copyStage.toDataURL({ pixelRatio: 2 });
      const imageElement = await loadImage(pngURL);
      if (context !== null) {
        context.drawImage(imageElement, 0, 0, output.width, output.height);
        const pngURL = canvas.toDataURL("image/png");
        return pngURL;
      }
    },
  };
})();

export default inpainter;
