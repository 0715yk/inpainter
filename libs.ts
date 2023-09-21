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
