declare const imagePrompt: {
    undo(): void;
    redo(): void;
    init: ({ id, brushOption, width, height, }: {
        id: string;
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
    setDrawingMode(mode: string): void;
    setVisibility(status: boolean): void;
    deleteImage(): void;
    changeImage(): void;
    setDrawLayer: (status: boolean) => void;
};
export default imagePrompt;
