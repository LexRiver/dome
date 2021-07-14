import { Animation } from './Animation';
interface InternalAttrs {
    ref?: (ref: any) => void;
    onShowAnimation?: Animation;
    onHideAnimation?: Animation;
}
export declare abstract class DomeComponent<Attrs> {
    attrs: Attrs & InternalAttrs;
    children: any;
    rootElement: Element | HTMLElement;
    constructor(attrs: Attrs & InternalAttrs, children: any);
    protected init(): void;
    protected abstract render(): HTMLElement;
    protected afterRender(): void;
    updateAsync(): Promise<void>;
    scheduleUpdate: (this: unknown) => void;
    protected afterUpdate(): void;
}
export {};
