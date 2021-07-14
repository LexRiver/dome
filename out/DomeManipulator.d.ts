import { ObservableValue } from "@lexriver/observable";
import { Animation } from './Animation';
export declare type CssClass = {
    [key: string]: boolean | ObservableValue<boolean>;
} | string[] | string;
export declare module DomeManipulator {
    function hideElementAsync(element: Element, animation?: Animation): Promise<void>;
    function unhideElementAsync(element: Element, animation?: Animation): Promise<void>;
    function insertAsFirstChildAsync(elementToInsert: Element, parentElement: Element | DocumentFragment, animation?: Animation): Promise<void>;
    function insertBeforeAsync(elementToInsert: Element, refElement: Element | null, parentElement: Element | DocumentFragment, animation?: Animation): Promise<void>;
    function insertAfterAsync(elementToInsert: Element, refElement: Element | null | undefined, parentElement: Element | DocumentFragment, animation?: Animation): Promise<void>;
    function insertByIndexAsync(elementToInsert: Element, index: number, parentElement: Element | DocumentFragment, animation?: Animation): Promise<void>;
    function replaceAsync(oldElement: Element, newElement: Element, animationHide?: Animation, animationShow?: Animation): Promise<Element>;
    function removeElementAsync(element: Element, animation?: Animation): Promise<void>;
    function forEachChildrenOf(element: Element, action: (child: ChildNode) => void): void;
    function removeAllChildrenAsync(element: Element, animation?: Animation): Promise<void>;
    function appendChildAsync(containerElement: Element, child: Element, animation?: Animation): Promise<void>;
    function appendChildrenAsync(containerElement: Element, children: Element | Element[] | DocumentFragment | Text | string | null | undefined, animation?: Animation): Promise<void>;
    function replaceAllChildrenAsync(containerElement: Element, childrenToInsert: Element | Element[] | DocumentFragment | Text | string | null | undefined, animationForHide?: Animation, animationForShow?: Animation): Promise<void>;
    function isInDom(el: Element | undefined): boolean;
    function addCssClassAsync(element: Element, cssClassName: string, removeAfterMs?: number): Promise<void>;
    function addCssClassesAsync(element: Element, cssClassNames: string[], removeAfterMs?: number): Promise<void>;
    function removeCssClass(element: Element, cssClassName: string): void;
    function removeCssClasses(element: Element, cssClassNames: string[]): void;
    /**
     * set css classes by array ['class1', 'class2'] or
     * by object {class1:true, class2:false} or
     * by Observable<boolean> {class1:true, class2:myVarO} or
     * by string
     * this function will replace class attribute so all classes that are not in params will be removed
     * @param value
     * @param element
     */
    function setCssClasses(element: Element, value: CssClass): void;
    function setAttribute(element: Element, name: string, value: any): void;
    function hasFocus(el: Element): boolean;
    function scrollIntoView(element: Element, paddingFromTop?: number): void;
    const scrollToTop: () => void;
    function getCurrentScrollPosition(): number;
    function scrollToAsync(p: {
        pxFromTop?: number;
        pxFromLeft?: number;
        smooth?: boolean;
        msStep?: number;
        maxMsToWait?: number;
    }): Promise<void>;
}
