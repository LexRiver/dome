import { ObservableValue, checkIfObservable } from "@lexriver/observable"
import { Animation } from './Animation'
import { Async } from "@lexriver/async"
import { DataTypes } from "@lexriver/data-types"


export type CssClass = {[key:string]:boolean|ObservableValue<boolean>} | string[] | string

export module DomeManipulator {

    export async function hideElementAsync(element: Element, animation?:Animation) {
        if(!element) throw new Error('hideElementAsync failed, no element')
        if((element as HTMLElement).hidden) return
        if(animation){
            await addCssClassAsync(element, animation.cssClassName, animation.timeMs)
        }
        (element as HTMLElement).style.display = 'none'; //TODO: remove this?
        (element as HTMLElement).hidden = true

    }

    export async function unhideElementAsync(element: Element, animation?:Animation) {
        if(!element) throw new Error('unhideElementAsync failed, no element')
        if(!(element as HTMLElement).hidden) return
        (element as HTMLElement).style.display = ''; //TODO: remove this?
        (element as HTMLElement).hidden = false
        if(animation){
            await addCssClassAsync(element, animation.cssClassName, animation.timeMs)
        }
    }

    export async function insertAsFirstChildAsync(elementToInsert: Element, parentElement: Element | DocumentFragment, animation?:Animation) {
        parentElement.insertBefore(elementToInsert, parentElement.firstChild)
        if(animation){
            await addCssClassAsync(elementToInsert, animation.cssClassName, animation.timeMs)
        }

    }

    export async function insertBeforeAsync(elementToInsert: Element, refElement: Element | null, parentElement: Element | DocumentFragment, animation?:Animation) {
        parentElement.insertBefore(elementToInsert, refElement)
        if(animation){
            await addCssClassAsync(elementToInsert, animation.cssClassName, animation.timeMs)
        }

    }

    export async function insertAfterAsync(elementToInsert: Element, refElement: Element | null | undefined, parentElement: Element | DocumentFragment, animation?:Animation) {
        if (refElement) {
            parentElement.insertBefore(elementToInsert, refElement.nextSibling)
        } else {
            parentElement.appendChild(elementToInsert)
        }
        if(animation){
            await addCssClassAsync(elementToInsert, animation.cssClassName, animation.timeMs)
        }

    }

    export async function insertByIndexAsync(elementToInsert: Element, index: number, parentElement: Element | DocumentFragment, animation?:Animation) {
        if (index == 0) {
            parentElement.appendChild(elementToInsert)
            if(animation){
                await addCssClassAsync(elementToInsert, animation.cssClassName, animation.timeMs)
            }
            return
        }

        await insertAfterAsync(elementToInsert, parentElement.children[index], parentElement, animation)
        
    }


    export async function replaceAsync(oldElement: Element, newElement: Element, animationHide?:Animation, animationShow?:Animation) {
        // hide
        if(animationHide){
            await addCssClassAsync(oldElement, animationHide.cssClassName, animationHide.timeMs)
        }

        // replace
        const parent = oldElement.parentNode
        if (!parent) {
            //TODO: do not throw error here?
            console.error('replaceAsync() failed, no parent', 'oldElement=', oldElement, 'type=', typeof oldElement, 'parent=', oldElement.parentElement, oldElement.parentNode)
            throw new Error('no parent for replaceAsync()')
        }
        parent.replaceChild(newElement, oldElement)

        // show
        if(animationShow){
            await addCssClassAsync(newElement, animationShow.cssClassName, animationShow.timeMs)
        }
        
        return newElement

    }

    export async function removeElementAsync(element: Element, animation?:Animation) {
        //console.log('#dome', 'removeELementAsync', element)
        if(animation){
            //console.log('#dome', 'add animation', animation.cssClassName, animation.timeMs, element)
            await addCssClassAsync(element, animation.cssClassName, animation.timeMs)
        }
        //console.log('#dome', 'removing from dom', element)
        element.remove()
    }

    export function forEachChildrenOf(element:Element, action:(child:ChildNode)=>void){
        for(let i=0;i<element.childNodes.length;i++){
            action(element.childNodes[i])
        }
    }


    export async function removeAllChildrenAsync(element: Element, animation?:Animation) {
        // await Promise.all( //TODO: this doesn't remove text nodes
        //     Array.from(element.children).map(child => removeElementAsync(child, animation))
        // )

        if(!animation){
            while (element.firstChild) {
                //element.removeChild(element.firstChild);
                element.firstChild.remove()
            }
            //return
        }  else {
            //console.log('##', 'assign remove animation for each children', element.childNodes)
            forEachChildrenOf(element, (child) => child.nodeType == Node.ELEMENT_NODE && (child as Element).classList.add(animation.cssClassName))
            //console.log('##', 'wait ms', animation.timeMs)
            await Async.waitMsAsync(animation.timeMs)
            //console.log('##', 'removing children', element.childNodes)
            forEachChildrenOf(element, (child) => child.remove())
            //console.log('##', 'done')
        }

        // if(element.children.length>0) {
        //     console.error('DomeManipulator: removeAllChildrenAsync() failed', 'length=', element.children.length, 'children=', element.children, 'animation=', animation, 'element=', element)
        //     throw new Error()
        // }

    }

    export async function appendChildAsync(containerElement:Element, child:Element, animation?:Animation){
        containerElement.appendChild(child)
        if(animation){
            await addCssClassAsync(child, animation.cssClassName, animation.timeMs)
        }
    }

    export async function appendChildrenAsync(containerElement:Element, children:Element | Element[] | DocumentFragment | Text | string | null | undefined, animation?:Animation){
        //console.log('DomeManipulator: appendChildrenAsync', 'containerELement=', containerElement, 'children=', children, 'animation=', animation)
        if (DataTypes.isString(children)) {
            // no animation for text?
            containerElement.appendChild(document.createTextNode(children as string))

        } else if (DataTypes.isArray(children)) {
            await Promise.all(
                (children as Element[]).map(child => appendChildAsync(containerElement, child, animation))
            )

        } else if (children) {
            await appendChildAsync(containerElement, children as Element, animation)

        }

    }


    export async function replaceAllChildrenAsync(
        containerElement: Element, 
        childrenToInsert: Element | Element[] | DocumentFragment | Text | string | null | undefined, 
        animationForHide?:Animation, 
        animationForShow?:Animation
    ) {
        //await removeAllChildrenAsync(containerElement, animationForHide)

        if(containerElement.childNodes.length>0){
            await removeAllChildrenAsync(containerElement, animationForHide) 
        }

        // while(containerElement.childNodes.length>0){
        //     await removeAllChildrenAsync(containerElement, animationForHide) // can be executed more than once! TODO: why?
        // }
        // if(containerElement.children.length>0) {
        //     console.error('DomeManipulator: replaceAllChildenrAsync() failed:', 'containerElement.children.length=', containerElement.children.length, 'children=', containerElement.children, 'containerElement=', containerElement, 'animationForHide=', animationForHide)
        //     throw new Error()
        // }
        await appendChildrenAsync(containerElement, childrenToInsert, animationForShow)    
    }


    
    export function isInDom(el: Element | undefined) {
        if (!el) return false
        return document.body.contains(el)
    }

    export async function addCssClassAsync(element: Element, cssClassName: string, removeAfterMs?:number) {
        if(element.nodeType !== Node.ELEMENT_NODE) return
        element.classList.add(cssClassName)
        if(removeAfterMs && removeAfterMs>0){
            await Async.waitMsAsync(removeAfterMs)
            element.classList.remove(cssClassName)
        }
        
    }

    export async function addCssClassesAsync(element: Element, cssClassNames: string[], removeAfterMs?:number) {
        await Promise.all(cssClassNames.map(cssClassName => addCssClassAsync(element, cssClassName, removeAfterMs)))
    }

    export function removeCssClass(element: Element, cssClassName: string) {
        element.classList.remove(cssClassName)
    }

    export function removeCssClasses(element: Element, cssClassNames: string[]) {
        for (let cssClassName of cssClassNames) {
            element.classList.remove(cssClassName)
        }


    }


    /**
     * set css classes by array ['class1', 'class2'] or 
     * by object {class1:true, class2:false} or 
     * by Observable<boolean> {class1:true, class2:myVarO} or
     * by string
     * this function will replace class attribute so all classes that are not in params will be removed
     * @param value 
     * @param element 
     */
    export function setCssClasses(element: Element, value: CssClass) {

        if (!value) return // skip empty
        if (DataTypes.isArray(value)) {
            //console.log('setCssClasses', 'data is array', value)
            setAttribute(element, 'class', (value as string[]).join(' '))

        } else if (DataTypes.isObjectWithKeys(value)) {
            //console.log('setCssClasses', 'data is object with keys', value)
            let classNameArray: Array<string> = []
            for (let [k, v] of Object.entries(value)) {
                if (checkIfObservable(v)) {
                    if ((v as ObservableValue<boolean>).get()) {
                        classNameArray.push(k)
                    }
                } else if (v) {
                    classNameArray.push(k)
                }
            }
            setAttribute(element, 'class', classNameArray.join(' '))

        } else {
            //console.log('setCssClasses', 'data is unknown', value)
            setAttribute(element, 'class', value)

        }

    }

    export function setAttribute(element: Element, name: string, value: any) {
        if (value === undefined || value === null) {
            return
        }

        // Naive support for xlink namespace
        // Full list: https://github.com/facebook/react/blob/1843f87/src/renderers/dom/shared/SVGDOMPropertyConfig.js#L258-L264
        if (/^xlink[AHRST]/.test(name)) {
            element.setAttributeNS('http://www.w3.org/1999/xlink', name.replace('xlink', 'xlink:').toLowerCase(), value)
        } else {
            element.setAttribute(name, value)
        }
    }

    export function hasFocus(el: Element):boolean {
        return document.activeElement == el
    }

    export function scrollIntoView(element: Element, paddingFromTop:number = 100) {
        const positionBefore = getCurrentScrollPosition()
        //element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        //const positionAfter = getCurrentScrollPosition()
        //console.log('before=', positionBefore, 'after=', positionAfter)
        let expectedPosition = element.getBoundingClientRect().top + window.pageYOffset;
        if(expectedPosition<positionBefore){
            expectedPosition += paddingFromTop
        } else {
            expectedPosition -= paddingFromTop
        }
        window.scrollTo({top: expectedPosition, behavior: 'smooth'});
        
    }

    // https://stackoverflow.com/questions/15935318/smooth-scroll-to-top/55926067
    export const scrollToTop = () => {
        //console.log('scrollToTop')
        let position = getCurrentScrollPosition()

        if (position > 0) {
            window.requestAnimationFrame(scrollToTop);
            if (position < 20) {
                window.scrollTo(0, 0)
            } else {
                window.scrollTo(0, position - position / 9)
            }
        }
    }

    export function getCurrentScrollPosition(){
        return document.documentElement.scrollTop || document.body.scrollTop;
    }

    export async function scrollToAsync(p:{
        pxFromTop?:number, 
        pxFromLeft?:number,
        smooth?:boolean,
        msStep?:number, 
        maxMsToWait?:number
    }){
        //console.log('scrollToAsync', p)
        const msStep = p.msStep ?? 50
        const maxMsToWait = p.maxMsToWait ?? 5000

        let scrollOptions:ScrollToOptions = {
        }

        if(p.pxFromTop){
            scrollOptions.top = p.pxFromTop
        }
        if(p.pxFromLeft){
            scrollOptions.left = p.pxFromLeft
        }
        if(p.smooth){
            scrollOptions.behavior = 'smooth'
        }


        try {
            if(p.pxFromLeft || p.pxFromTop){
                await Async.waitForFunctionToReturnTrueAsync(() => {
                    if(p.pxFromTop){
                        return document.body.scrollHeight >= p.pxFromTop
                    }
                    if(p.pxFromLeft){
                        return document.body.scrollWidth >= p.pxFromLeft
                    }
                    return false
                }, msStep, maxMsToWait)
            }
            
        } catch(error){
            // ignore error

        }
        //console.log('scrollToY', pxFromTop, 'height=', document.body.clientHeight)
        //console.log('scrollToAsync now', scrollOptions)
        window.scrollTo(scrollOptions)
    }





}