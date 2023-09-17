var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export function getDrawCursor(strokeWidth) {
    const circle = `
  <svg
    height="${strokeWidth}"
    width="${strokeWidth}"
    viewBox="0 0 ${strokeWidth * 2} ${strokeWidth * 2}"
    xmlns="http://www.w3.org/2000/svg"
    >
        <defs>
            <mask 
                id="maskingFrame"
            >
                <circle
                    cx="50%"
                    cy="50%"
                    r="${strokeWidth}"
                    stroke="#000000"
                    fill="#FFFFFF"
                    
                />  
                <circle
                    cx="50%"
                    cy="50%"
                    r="${strokeWidth / 1.15}"
                />
            </mask>
        </defs>
        <circle
            cx="50%"
            cy="50%"
            r="${strokeWidth * 3}"
            mask="url(#maskingFrame)"  
            fill="#FFFFFF" 
         
        />
    </svg>
    `;
    return `url(data:image/svg+xml;base64,${window.btoa(circle)}) ${Math.ceil(strokeWidth / 2)} ${Math.ceil(strokeWidth / 2)}, pointer`;
}
export function dataURItoBlob(dataURI) {
    const byteString = window.atob(dataURI.split(",")[1]);
    const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    const bb = new Blob([ab], { type: mimeString });
    return bb;
}
export function getContainSize(containerWidth, containerHeight, outputWidth, outputHeight) {
    const containerRatio = containerWidth / containerHeight;
    const outputRatio = outputWidth / outputHeight;
    return containerRatio < outputRatio
        ? { width: containerWidth, height: containerWidth / outputRatio }
        : { width: containerHeight * outputRatio, height: containerHeight };
}
export class EventListeners {
    constructor() {
        this._listeners = {};
    }
    addEventListener(event, callback) {
        var _a;
        if (!(event in this._listeners)) {
            this._listeners[event] = [];
        }
        (_a = this._listeners[event]) === null || _a === void 0 ? void 0 : _a.push(callback);
    }
    removeEventListener(event, callback) {
        var _a;
        this._listeners[event] = (_a = this._listeners[event]) === null || _a === void 0 ? void 0 : _a.filter((fn) => fn !== callback);
    }
    dispatch(event, ...args) {
        var _a;
        (_a = this._listeners[event]) === null || _a === void 0 ? void 0 : _a.forEach((fn) => fn(...args));
    }
}
export function convertBlackToTransparent(imageUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const image = new Image();
        image.crossOrigin = "anonymous";
        const loadImagePromise = new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
        });
        image.src = imageUrl;
        yield loadImagePromise;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (context === null)
            return;
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
        const transparentImageUrl = canvas.toDataURL();
        return transparentImageUrl;
    });
}
