// src/types/dom-augment.d.ts
declare global {
    interface HTMLInputElement {
        /** Chromium 계열 전용 네이티브 피커 */
        showPicker?: () => void;
    }
}
export {};
