export declare function getContainSize(containerWidth: number, containerHeight: number, outputWidth: number, outputHeight: number): {
    width: number;
    height: number;
};
export declare namespace Event {
    type CallbackTypes = Record<string, (...args: any[]) => void>;
    type Events<T extends CallbackTypes> = keyof T;
    type Callback<T extends CallbackTypes, E extends Events<T>> = T[E];
    type CallbackArgs<E extends Events<T>, T extends CallbackTypes> = Parameters<T[E]>;
    type Listeners<T extends CallbackTypes> = {
        [E in Events<T>]?: Array<T[E]>;
    };
}
export declare class EventListeners<T extends Event.CallbackTypes> {
    private _listeners;
    constructor();
    addEventListener<E extends Event.Events<T>>(event: E, callback: T[E]): void;
    removeEventListener<E extends Event.Events<T>>(event: E, callback: T[E]): void;
    dispatch<E extends Event.Events<T>>(event: E, ...args: Event.CallbackArgs<E, T>): void;
}
export declare function loadImage(path: string): Promise<HTMLImageElement>;
