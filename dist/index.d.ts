declare const imagePrompt: {
    on(eventType: string, eventCallback: (...args: any) => void): void;
    off(eventType: string, eventCallback: (...args: any) => void): void;
    undo(): void;
    redo(): void;
    init: ({ container, brushOption, width, height, }: {
        container: string | HTMLDivElement;
        brushOption?: {
            strokeWidth: number;
            color: string;
        } | undefined;
        width?: number | undefined;
        height?: number | undefined;
    }) => void;
    importImage({ src, containerWidth, containerHeight, selectedWidth, selectedHeight, }: {
        src: string;
        containerWidth: number;
        containerHeight: number;
        selectedWidth: number;
        selectedHeight: number;
    }): void;
    exportImage(): Promise<Blob | undefined>;
    setStrokeColor(color: string): void;
    setStrokeWidth(width: number | string): void;
    setDrawingMode(mode: "brush" | "eraser" | "on" | "off"): void;
    deleteImage(): void;
};
export default imagePrompt;
