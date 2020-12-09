export declare function h(tagName: any, attrs: any, ...childrenArgs: any[]): any;
export declare const React: {
    createElement: typeof h;
    Fragment: {
        new (): DocumentFragment;
        prototype: DocumentFragment;
    } | (() => void);
};
export default React;
