import { Animation } from './Animation';
interface KeyToElementPair {
    key: string;
    element: HTMLElement;
}
export declare class AnimatedArray<T> {
    protected params: {
        parentElement?: HTMLElement;
        array?: T[];
        getKey: (o: T) => string;
        getHtmlElement: (o: T) => HTMLElement;
        animationShow?: Animation;
        animationHide?: Animation;
    };
    arrayOfKeyToElement: KeyToElementPair[];
    constructor(params: {
        parentElement?: HTMLElement;
        array?: T[];
        getKey: (o: T) => string;
        getHtmlElement: (o: T) => HTMLElement;
        animationShow?: Animation;
        animationHide?: Animation;
    });
    get size(): number;
    update(array: T[], parentElement?: HTMLElement | Element): void;
}
export {};
