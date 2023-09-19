export function getDrawCursor(strokeWidth: number) {
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
                    r="${strokeWidth / 1.2 + 0.6}"
                    stroke="#000000"
                    stroke-width="0.6"
                    vector-effect="non-scaling-stroke"
                />
            </mask>
        </defs>
        <circle
            cx="50%"
            cy="50%"
            r="${strokeWidth - 0.6}"
            mask="url(#maskingFrame)"  
            stroke="#000000"
            stroke-width="0.6"
            fill="#FFFFFF"
            vector-effect="non-scaling-stroke"
        />
    </svg>
    `;

  return `url(data:image/svg+xml;base64,${window.btoa(circle)}) ${Math.ceil(
    strokeWidth / 2
  )} ${Math.ceil(strokeWidth / 2)}, pointer`;
}

export function getContainSize(
  containerWidth: number,
  containerHeight: number,
  outputWidth: number,
  outputHeight: number
) {
  const containerRatio = containerWidth / containerHeight;
  const outputRatio = outputWidth / outputHeight;
  return containerRatio < outputRatio
    ? { width: containerWidth, height: containerWidth / outputRatio }
    : { width: containerHeight * outputRatio, height: containerHeight };
}

export namespace Event {
  export type CallbackTypes = Record<string, (...args: any[]) => void>;

  export type Events<T extends CallbackTypes> = keyof T;
  export type Callback<T extends CallbackTypes, E extends Events<T>> = T[E];

  export type CallbackArgs<
    E extends Events<T>,
    T extends CallbackTypes
  > = Parameters<T[E]>;

  export type Listeners<T extends CallbackTypes> = {
    [E in Events<T>]?: Array<T[E]>;
  };
}

export class EventListeners<T extends Event.CallbackTypes> {
  private _listeners: Event.Listeners<T>;

  constructor() {
    this._listeners = {};
  }

  addEventListener<E extends Event.Events<T>>(event: E, callback: T[E]) {
    if (!(event in this._listeners)) {
      this._listeners[event] = [];
    }
    this._listeners[event]?.push(callback);
  }

  removeEventListener<E extends Event.Events<T>>(event: E, callback: T[E]) {
    this._listeners[event] = this._listeners[event]?.filter(
      (fn) => fn !== callback
    );
  }

  dispatch<E extends Event.Events<T>>(
    event: E,
    ...args: Event.CallbackArgs<E, T>
  ) {
    this._listeners[event]?.forEach((fn) => fn(...args));
  }
}

export function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = path;
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (e) => {
      reject(e);
    };
  });
}
