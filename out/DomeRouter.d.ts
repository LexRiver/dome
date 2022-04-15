export declare type RouteAction = (params: {
    [key: string]: string;
}, url: string, scrollToPreviousPositionFunctionAsync: () => Promise<void>) => void | Promise<void>;
export declare module DomeRouter {
    let maxHistoryUrlsCount: number;
    function navigate(url: string): void;
    function goBack(): void;
    function goForward(): void;
    function changeUrl(url: string): void;
    function getCurrentUrl(): string;
    function resolveUrl(url?: string): void;
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
