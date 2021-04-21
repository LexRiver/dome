export declare type RouteAction = (params: {
    [key: string]: string;
}, url: string) => void | Promise<void>;
interface HistoryUrl {
    url: string;
    scroll: number;
}
export declare module DomeRouter {
    let maxHistoryUrlsCount: number;
    function navigate(url: string): void;
    function goBack(): void;
    function goForward(): void;
    function changeUrl(url: string): void;
    function getCurrentUrl(): string | HistoryUrl;
    /**
     * get previous page url navigated by router
     * @param previousPageIndex 0=previousPage, 1=previousPage-1, etc
     */
    function getPreviousPageUrl(previousPageIndex?: number): string | undefined;
    function reloadCurrentPage(addToHistory?: boolean): void;
    function resolveUrl(url?: string, addToHistory?: boolean): void;
    function onRoute(route: string, exactMatch: boolean, action: RouteAction): void;
    function onNotFound(action: () => void): void;
    /**
     * Check if url matched route.
     *   example: /get-product/445345, /get-product/:productId, true ==> Map([productId:445345])
     *   example: /get-product/123, /another-route, true ==> undefined
     *   example: /articles, /articles, true ==> Map()
     *   example: /articles/some-article, /articles, false ==> Map()
     * @param url
     * @param route
     * @param exactMatch
     */
    function checkUrlMatchRouteAndGetParameters(url: string, route: string, exactMatch?: boolean): Object | undefined;
}
export {};
