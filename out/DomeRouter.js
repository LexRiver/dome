import { DomeManipulator } from "./DomeManipulator";
const filename = '[DomeRouter]';
export var DomeRouter;
(function (DomeRouter) {
    const historyUrls = [];
    const scrollPositionByUrl = new Map();
    DomeRouter.maxHistoryUrlsCount = 20;
    const allRoutes = [];
    let onNotFoundAction = undefined;
    window.addEventListener('popstate', async (e) => {
        // on go back/forward
        //console.log(filename, 'window.popstate event', e, 'historyUrls=', historyUrls)
        const url = window.location.pathname;
        await executeAsync(url, getScrollPositionForUrl(url));
        await DomeManipulator.scrollToAsync({
            pxFromTop: getScrollPositionForUrl(window.location.pathname)
        });
    });
    function getScrollPositionForUrl(url) {
        return scrollPositionByUrl.get(url) ?? 0;
    }
    function saveScrollPositionForUrl(url) {
        scrollPositionByUrl.set(url, DomeManipulator.getCurrentScrollPosition());
    }
    function saveScrollPositionForCurrentUrl() {
        scrollPositionByUrl.set(getCurrentUrl(), DomeManipulator.getCurrentScrollPosition());
    }
    function navigate(url) {
        addUrlToHistory(getCurrentUrl());
        saveScrollPositionForCurrentUrl();
        window.history.pushState(null, '', url);
        executeAsync(url, 0);
        DomeManipulator.scrollToTop();
        // historyUrls.push()
    }
    DomeRouter.navigate = navigate;
    function goBack() {
        window.history.go(-1);
    }
    DomeRouter.goBack = goBack;
    function goForward() {
        window.history.go(+1);
    }
    DomeRouter.goForward = goForward;
    function changeUrl(url) {
        window.history.replaceState(null, '', url);
        // if(historyUrls.length>0){
        //     historyUrls[historyUrls.length-1].url = url
        // }
    }
    DomeRouter.changeUrl = changeUrl;
    function addUrlToHistory(url) {
        historyUrls.push({ url, scroll: 0 });
        while (historyUrls.length > DomeRouter.maxHistoryUrlsCount) {
            historyUrls.shift();
        }
        // save scroll position to previous url
        if (historyUrls.length > 1) {
            historyUrls[historyUrls.length - 2].scroll = DomeManipulator.getCurrentScrollPosition();
        }
        console.log('adding url to history', url);
        console.log('historyUrls=', historyUrls);
    }
    function getCurrentUrl() {
        return window.location.pathname;
        // return historyUrls.length>0?historyUrls[historyUrls.length-1]:window.location.pathname
    }
    DomeRouter.getCurrentUrl = getCurrentUrl;
    /**
     * get previous page url navigated by router
     * @param previousPageIndex 0=previousPage, 1=previousPage-1, etc
     */
    function getPreviousPageUrl(previousPageIndex = 0) {
        //if(historyUrls.length==0) return undefined
        let index = historyUrls.length - 2 - previousPageIndex;
        if (index >= 0 && index < historyUrls.length)
            return historyUrls[index].url;
        return undefined;
    }
    DomeRouter.getPreviousPageUrl = getPreviousPageUrl;
    // export function reloadCurrentPage(addToHistory:boolean = false){
    //     const url = window.location.pathname
    //     if(addToHistory) addUrlToHistory(url)
    //     executeAsync(url, getScrollPositionForUrl(url)) // TODO: check
    // }
    function resolveUrl(url = window.location.pathname, addToHistory = true) {
        if (addToHistory)
            addUrlToHistory(window.location.pathname);
        executeAsync(url, getScrollPositionForUrl(url));
    }
    DomeRouter.resolveUrl = resolveUrl;
    function onRoute(route, exactMatch, action) {
        if (route[0] !== '/')
            throw new Error('Please provide correct route. route=' + route);
        let routeSlices = getRouteSlices(route);
        allRoutes.push({ routeSlices, exactMatch, action });
    }
    DomeRouter.onRoute = onRoute;
    function getRouteSlices(route) {
        //return route.split('/').filter(x => x.length>0).map(x => decodeURIComponent(x))
        return route.split('/').map(x => decodeURIComponent(x));
    }
    function onNotFound(action) {
        onNotFoundAction = action;
    }
    DomeRouter.onNotFound = onNotFound;
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
    function checkUrlMatchRouteAndGetParameters(url, route, exactMatch = true) {
        // this function is purely for export
        const urlSlices = getRouteSlices(url);
        const routeSlices = getRouteSlices(route);
        if (exactMatch && routeSlices.length !== urlSlices.length)
            return undefined;
        // all routeSlices must match for !exactMatch
        //const extractedParameters = new Map<string,string>()
        const extractedParameters = {};
        for (let i = 0; i < routeSlices.length; i++) {
            let cRouteSlice = routeSlices[i];
            let cUrlSlice = urlSlices[i]; // could be undefined
            //console.info('\t\t cRouteSlice=', cRouteSlice, 'cUrlSlice=', cUrlSlice)
            if (cRouteSlice.startsWith(':')) {
                // we have a param name
                if (cUrlSlice === undefined) {
                    return undefined;
                }
                const [name, value] = parseToNameAndValue(cRouteSlice, cUrlSlice);
                extractedParameters[name] = value;
            }
            else {
                // no param name
                if (cRouteSlice !== cUrlSlice) {
                    return undefined;
                }
            }
        }
        return extractedParameters;
    }
    DomeRouter.checkUrlMatchRouteAndGetParameters = checkUrlMatchRouteAndGetParameters;
    /**
     * parse name with type or without type
     * :quantity
     * :quantity<number>
     * :quantity<float>
     * :quantity<int>
     *
     * @param name string that starts with `:`
     * @param value string that contains value
     */
    function parseToNameAndValue(name, value) {
        if (!name)
            throw new Error('no name');
        // parse name with type
        // :quantity<number>
        // :lat<float>
        // :count<int>
        const haveMatch = name.match(/:(.+)<(.+)>/);
        if (haveMatch) {
            const paramName = haveMatch[1];
            const paramType = haveMatch[2].toLowerCase();
            if (paramType == 'int') {
                return [paramName, parseInt(value)];
            }
            else if (paramType == 'float') {
                return [paramName, parseFloat(value)];
            }
            else if (paramType == 'number') {
                return [paramName, Number(value)];
            }
            else {
                return [paramName, value];
            }
        }
        else {
            return [name.substring(1), value];
        }
    }
    async function executeAsync(url = window.location.pathname, scrollToPosition) {
        //const url = window.location.pathname
        const urlSlices = getRouteSlices(url);
        // urlSlices = show, category, 345
        let countOfFoundRoutes = 0;
        for (let route of allRoutes) {
            //console.info('\t route=', route.routeSlices, route.exactMatch)
            // route.routeSlices = show, category, :categoryId
            if (route.exactMatch && route.routeSlices.length != urlSlices.length)
                continue;
            // all routeSlices must match for !exactMatch
            let matched = true;
            //let extractedParameters = new Map<string,string>()
            const extractedParameters = {};
            for (let i = 0; i < route.routeSlices.length; i++) {
                let cRouteSlice = route.routeSlices[i];
                let cUrlSlice = urlSlices[i]; // could be undefined
                //console.info('\t\t cRouteSlice=', cRouteSlice, 'cUrlSlice=', cUrlSlice)
                if (cRouteSlice && typeof cRouteSlice === 'string' && cRouteSlice.startsWith(':')) {
                    // we have a param name
                    if (cUrlSlice === undefined) {
                        matched = false;
                        continue;
                    }
                    // we have some variable, save it
                    const [name, value] = parseToNameAndValue(cRouteSlice, cUrlSlice);
                    extractedParameters[name] = value;
                }
                else {
                    // no param name
                    if (cRouteSlice !== cUrlSlice) {
                        matched = false;
                        continue;
                    }
                }
            }
            if (matched) {
                countOfFoundRoutes++;
                //console.log('DomeRouter', 'executeAsync', url, route, extractedParameters)
                await route.action(extractedParameters, url, async () => {
                    await DomeManipulator.scrollToAsync({
                        pxFromTop: scrollToPosition
                    });
                });
            }
        }
        if (countOfFoundRoutes == 0 && onNotFoundAction) {
            //console.log('DomeRouter', 'onNotFoundAction()')
            onNotFoundAction();
        }
    }
})(DomeRouter || (DomeRouter = {}));
