declare const inpainter: {
    getStage(): import("konva/lib/Stage").Stage | null;
    goTo(index: number): void;
    undo(): void;
    redo(): void;
    on(eventType: string, eventCallback: (...args: any) => void): void;
    off(eventType: string, eventCallback: (...args: any) => void): void;
    init: ({ container, brushOption, width, height, on, cache, patternSrc, containerSize, }: {
        container: string | HTMLDivElement;
        brushOption?: {
            strokeWidth: number;
        } | undefined;
        width?: number | undefined;
        height?: number | undefined;
        on?: {
            [eventType: string]: (arg: any) => void;
        } | undefined;
        cache?: string | undefined;
        patternSrc: string;
        containerSize: {
            width: null | number;
            height: null | number;
        };
    }) => Promise<true | undefined>;
    importImage({ src, selectedWidth, selectedHeight, maskSrc, }: {
        src: string;
        selectedWidth: number;
        selectedHeight: number;
        maskSrc?: string | undefined;
    }): Promise<true | null | undefined>;
    setStrokeWidth(width: number | string): void;
    setDrawingMode(mode: "brush" | "eraser" | "on" | "off"): void;
    deleteImage(): void;
    resetHistory(): void;
    exportMask(): Promise<string | undefined>;
    exportImage(): Promise<string | undefined>;
};
export default inpainter;
