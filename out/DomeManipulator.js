import { checkIfObservable } from "@lexriver/observable";
import { Async } from "@lexriver/async";
import { DataTypes } from "@lexriver/data-types";
export var DomeManipulator;
(function (DomeManipulator) {
    async function hideElementAsync(element, animation) {
        if (!element)
            throw new Error('hideElementAsync failed, no element');
        if (element.hidden)
            return;
        if (animation) {
            await addCssClassAsync(element, animation.cssClassName, animation.timeMs);
        }
        element.style.display = 'none'; //TODO: remove this?
        element.hidden = true;
    }
    DomeManipulator.hideElementAsync = hideElementAsync;
    async function unhideElementAsync(element, animation) {
        if (!element)
            throw new Error('unhideElementAsync failed, no element');
        if (!element.hidden)
            return;
        element.style.display = ''; //TODO: remove this?
        element.hidden = false;
        if (animation) {
            await addCssClassAsync(element, animation.cssClassName, animation.timeMs);
        }
    }
    DomeManipulator.unhideElementAsync = unhideElementAsync;
    async function insertAsFirstChildAsync(elementToInsert, parentElement, animation) {
        parentElement.insertBefore(elementToInsert, parentElement.firstChild);
        if (animation) {
            await addCssClassAsync(elementToInsert, animation.cssClassName, animation.timeMs);
        }
    }
    DomeManipulator.insertAsFirstChildAsync = insertAsFirstChildAsync;
    async function insertBeforeAsync(elementToInsert, refElement, parentElement, animation) {
        parentElement.insertBefore(elementToInsert, refElement);
        if (animation) {
            await addCssClassAsync(elementToInsert, animation.cssClassName, animation.timeMs);
        }
    }
    DomeManipulator.insertBeforeAsync = insertBeforeAsync;
    async function insertAfterAsync(elementToInsert, refElement, parentElement, animation) {
        if (refElement) {
            parentElement.insertBefore(elementToInsert, refElement.nextSibling);
        }
        else {
            parentElement.appendChild(elementToInsert);
        }
        if (animation) {
            await addCssClassAsync(elementToInsert, animation.cssClassName, animation.timeMs);
        }
    }
    DomeManipulator.insertAfterAsync = insertAfterAsync;
    async function insertByIndexAsync(elementToInsert, index, parentElement, animation) {
        if (index == 0) {
            parentElement.appendChild(elementToInsert);
            if (animation) {
                await addCssClassAsync(elementToInsert, animation.cssClassName, animation.timeMs);
            }
            return;
        }
        await insertAfterAsync(elementToInsert, parentElement.children[index], parentElement, animation);
    }
    DomeManipulator.insertByIndexAsync = insertByIndexAsync;
    async function replaceAsync(oldElement, newElement, animationHide, animationShow) {
        if (!oldElement.parentNode) {
            // almost impossible if in DOM
            console.error('replaceAsync() failed, no parentNode.', 'oldElement=', oldElement);
            throw new Error('no parent node for replaceAsync');
        }
        // hide
        if (animationHide) {
            await addCssClassAsync(oldElement, animationHide.cssClassName, animationHide.timeMs);
        }
        // replace
        const parent = oldElement.parentNode;
        if (!parent) {
            //TODO: do not throw error here?
            console.error('replaceAsync() failed, no parent. Probably node was deleted while hide animation.', 'oldElement=', oldElement, 'type=', typeof oldElement, 'parent=', oldElement.parentElement, oldElement.parentNode);
            throw new Error('no parent for replaceAsync()');
        }
        parent.replaceChild(newElement, oldElement);
        // show
        if (animationShow) {
            await addCssClassAsync(newElement, animationShow.cssClassName, animationShow.timeMs);
        }
        return newElement;
    }
    DomeManipulator.replaceAsync = replaceAsync;
    async function removeElementAsync(element, animation) {
        //console.log('#dome', 'removeELementAsync', element)
        if (animation) {
            //console.log('#dome', 'add animation', animation.cssClassName, animation.timeMs, element)
            await addCssClassAsync(element, animation.cssClassName, animation.timeMs);
        }
        //console.log('#dome', 'removing from dom', element)
        element.remove();
    }
    DomeManipulator.removeElementAsync = removeElementAsync;
    function forEachChildrenOf(element, action) {
        for (let i = 0; i < element.childNodes.length; i++) {
            action(element.childNodes[i]);
        }
    }
    DomeManipulator.forEachChildrenOf = forEachChildrenOf;
    async function removeAllChildrenAsync(element, animation) {
        // await Promise.all( //TODO: this doesn't remove text nodes
        //     Array.from(element.children).map(child => removeElementAsync(child, animation))
        // )
        if (!animation) {
            while (element.firstChild) {
                //element.removeChild(element.firstChild);
                element.firstChild.remove();
            }
            //return
        }
        else {
            //console.log('##', 'assign remove animation for each children', element.childNodes)
            forEachChildrenOf(element, (child) => child.nodeType == Node.ELEMENT_NODE && child.classList.add(animation.cssClassName));
            //console.log('##', 'wait ms', animation.timeMs)
            await Async.waitMsAsync(animation.timeMs);
            //console.log('##', 'removing children', element.childNodes)
            forEachChildrenOf(element, (child) => child.remove());
            //console.log('##', 'done')
        }
        // if(element.children.length>0) {
        //     console.error('DomeManipulator: removeAllChildrenAsync() failed', 'length=', element.children.length, 'children=', element.children, 'animation=', animation, 'element=', element)
        //     throw new Error()
        // }
    }
    DomeManipulator.removeAllChildrenAsync = removeAllChildrenAsync;
    async function appendChildAsync(containerElement, child, animation) {
        containerElement.appendChild(child);
        if (animation) {
            await addCssClassAsync(child, animation.cssClassName, animation.timeMs);
        }
    }
    DomeManipulator.appendChildAsync = appendChildAsync;
    async function appendChildrenAsync(containerElement, children, animation) {
        //console.log('DomeManipulator: appendChildrenAsync', 'containerELement=', containerElement, 'children=', children, 'animation=', animation)
        if (DataTypes.isString(children)) {
            // no animation for text?
            containerElement.appendChild(document.createTextNode(children));
        }
        else if (DataTypes.isArray(children)) {
            await Promise.all(children.map(child => appendChildAsync(containerElement, child, animation)));
        }
        else if (children) {
            await appendChildAsync(containerElement, children, animation);
        }
    }
    DomeManipulator.appendChildrenAsync = appendChildrenAsync;
    async function replaceAllChildrenAsync(containerElement, childrenToInsert, animationForHide, animationForShow) {
        //await removeAllChildrenAsync(containerElement, animationForHide)
        if (containerElement.childNodes.length > 0) {
            await removeAllChildrenAsync(containerElement, animationForHide);
        }
        // while(containerElement.childNodes.length>0){
        //     await removeAllChildrenAsync(containerElement, animationForHide) // can be executed more than once! TODO: why?
        // }
        // if(containerElement.children.length>0) {
        //     console.error('DomeManipulator: replaceAllChildenrAsync() failed:', 'containerElement.children.length=', containerElement.children.length, 'children=', containerElement.children, 'containerElement=', containerElement, 'animationForHide=', animationForHide)
        //     throw new Error()
        // }
        await appendChildrenAsync(containerElement, childrenToInsert, animationForShow);
    }
    DomeManipulator.replaceAllChildrenAsync = replaceAllChildrenAsync;
    function isInDom(el) {
        if (!el)
            return false;
        return document.body.contains(el);
    }
    DomeManipulator.isInDom = isInDom;
    async function addCssClassAsync(element, cssClassName, removeAfterMs) {
        if (element.nodeType !== Node.ELEMENT_NODE)
            return;
        element.classList.add(cssClassName);
        if (removeAfterMs && removeAfterMs > 0) {
            await Async.waitMsAsync(removeAfterMs);
            element.classList.remove(cssClassName);
        }
    }
    DomeManipulator.addCssClassAsync = addCssClassAsync;
    async function addCssClassesAsync(element, cssClassNames, removeAfterMs) {
        await Promise.all(cssClassNames.map(cssClassName => addCssClassAsync(element, cssClassName, removeAfterMs)));
    }
    DomeManipulator.addCssClassesAsync = addCssClassesAsync;
    function removeCssClass(element, cssClassName) {
        element.classList.remove(cssClassName);
    }
    DomeManipulator.removeCssClass = removeCssClass;
    function removeCssClasses(element, cssClassNames) {
        for (let cssClassName of cssClassNames) {
            element.classList.remove(cssClassName);
        }
    }
    DomeManipulator.removeCssClasses = removeCssClasses;
    /**
     * set css classes by array ['class1', 'class2'] or
     * by object {class1:true, class2:false} or
     * by Observable<boolean> {class1:true, class2:myVarO} or
     * by string
     * this function will replace class attribute so all classes that are not in params will be removed
     * @param value
     * @param element
     */
    function setCssClasses(element, value) {
        if (!value)
            return; // skip empty
        if (DataTypes.isArray(value)) {
            //console.log('setCssClasses', 'data is array', value)
            setAttribute(element, 'class', value.join(' '));
        }
        else if (DataTypes.isObjectWithKeys(value)) {
            //console.log('setCssClasses', 'data is object with keys', value)
            let classNameArray = [];
            for (let [k, v] of Object.entries(value)) {
                if (checkIfObservable(v)) {
                    if (v.get()) {
                        classNameArray.push(k);
                    }
                }
                else if (v) {
                    classNameArray.push(k);
                }
            }
            setAttribute(element, 'class', classNameArray.join(' '));
        }
        else {
            //console.log('setCssClasses', 'data is unknown', value)
            setAttribute(element, 'class', value);
        }
    }
    DomeManipulator.setCssClasses = setCssClasses;
    function setAttribute(element, name, value) {
        if (value === undefined || value === null) {
            return;
        }
        // Naive support for xlink namespace
        // Full list: https://github.com/facebook/react/blob/1843f87/src/renderers/dom/shared/SVGDOMPropertyConfig.js#L258-L264
        if (/^xlink[AHRST]/.test(name)) {
            element.setAttributeNS('http://www.w3.org/1999/xlink', name.replace('xlink', 'xlink:').toLowerCase(), value);
        }
        else {
            element.setAttribute(name, value);
        }
    }
    DomeManipulator.setAttribute = setAttribute;
    function hasFocus(el) {
        return document.activeElement == el;
    }
    DomeManipulator.hasFocus = hasFocus;
    function scrollIntoView(element, paddingFromTop = 100) {
        const positionBefore = getCurrentScrollPosition();
        //element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        //const positionAfter = getCurrentScrollPosition()
        //console.log('before=', positionBefore, 'after=', positionAfter)
        let expectedPosition = element.getBoundingClientRect().top + window.pageYOffset;
        if (expectedPosition < positionBefore) {
            expectedPosition += paddingFromTop;
        }
        else {
            expectedPosition -= paddingFromTop;
        }
        window.scrollTo({ top: expectedPosition, behavior: 'smooth' });
    }
    DomeManipulator.scrollIntoView = scrollIntoView;
    // https://stackoverflow.com/questions/15935318/smooth-scroll-to-top/55926067
    DomeManipulator.scrollToTop = () => {
        //console.log('scrollToTop')
        let position = getCurrentScrollPosition();
        if (position > 0) {
            window.requestAnimationFrame(DomeManipulator.scrollToTop);
            if (position < 20) {
                window.scrollTo(0, 0);
            }
            else {
                window.scrollTo(0, position - position / 9);
            }
        }
    };
    function getCurrentScrollPosition() {
        return document.documentElement.scrollTop || document.body.scrollTop;
    }
    DomeManipulator.getCurrentScrollPosition = getCurrentScrollPosition;
    async function scrollToAsync(p) {
        //console.log('scrollToAsync', p)
        const msStep = p.msStep ?? 50;
        const maxMsToWait = p.maxMsToWait ?? 5000;
        let scrollOptions = {};
        if (p.pxFromTop) {
            scrollOptions.top = p.pxFromTop;
        }
        if (p.pxFromLeft) {
            scrollOptions.left = p.pxFromLeft;
        }
        if (p.smooth) {
            scrollOptions.behavior = 'smooth';
        }
        try {
            if (p.pxFromLeft || p.pxFromTop) {
                await Async.waitForFunctionToReturnTrueAsync(() => {
                    if (p.pxFromTop) {
                        return document.body.scrollHeight >= p.pxFromTop;
                    }
                    if (p.pxFromLeft) {
                        return document.body.scrollWidth >= p.pxFromLeft;
                    }
                    return false;
                }, msStep, maxMsToWait);
            }
        }
        catch (error) {
            // ignore error
        }
        //console.log('scrollToY', pxFromTop, 'height=', document.body.clientHeight)
        //console.log('scrollToAsync now', scrollOptions)
        window.scrollTo(scrollOptions);
    }
    DomeManipulator.scrollToAsync = scrollToAsync;
})(DomeManipulator || (DomeManipulator = {}));
