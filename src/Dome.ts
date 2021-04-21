// inspiration: https://github.com/vadimdemedes/dom-chef/blob/master/index.js
//import svgTagNames from 'svg-tag-names'
const svgTagNames = require('svg-tag-names')
//import svgTagNames from 'svg-tag-names'
//import * as flatten from 'arr-flatten'
//import { DomeEventDispatcher } from './DomeEventDispatcher.ts.old'
import { DomeManipulator } from './DomeManipulator'
import { ObservableValue, checkIfObservable } from '@lexriver/observable'
import { DomeComponent } from './DomeComponent'
import { DataTypes} from '@lexriver/data-types'

const filename = '[Dome]: '


interface OnEventObject{
    eventName:string
    eventParams:Object
    eventReaction:(eventParams:Object)=>void
}



//const mountFunctionByNode = new Map<Node, (ref:any)=>void>()

// https://github.com/jonschlinkert/arr-flatten/blob/master/index.js
function flattenArray(arr:any[], res:any[] = []){
    var i = 0, cur;
    var len = arr.length;
    for (; i < len; i++) {
        cur = arr[i];
        Array.isArray(cur) ? flattenArray(cur, res) : res.push(cur);
    }
    return res;
}


function checkIfNonDimensionalCssName(name:string){
    // Copied from Preact
    const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i
    return IS_NON_DIMENSIONAL.test(name)
}


const excludeSvgTags = [
	'a',
	'audio',
	'canvas',
	'iframe',
	'script',
	'video'
]

const svgTags = svgTagNames.filter(name => !excludeSvgTags.includes(name))

const isSVG = tagName => svgTags.includes(tagName)

const setCSSProps = (el, style:{[key:string]:string|number}) => {
    if(DataTypes.isString(style)){
        el.style = style

    } else if(DataTypes.isObjectWithKeys(style)){
        Object.keys(style).forEach(name => {
            let value = style[name]

            if (typeof value === 'number' && !checkIfNonDimensionalCssName(name)) {
                value = `${value}px`
            }

            el.style[name] = value
        })
    }
}

const createElement = (tagName) => {
	if (isSVG(tagName)) {
		return document.createElementNS('http://www.w3.org/2000/svg', tagName)
	}

	if (tagName === DocumentFragment) {
		return document.createDocumentFragment()
	}

	return document.createElement(tagName)
}


// function subscribeToEventByParam(x:OnEventObject, el:HTMLElement){
//     if(
//         !x.eventName ||
//         Data.isString(x.eventName) == false ||
//         !x.eventReaction ||
//         Data.isFunction(x.eventReaction) == false
//     ){
//         console.error('x=', x, 'el=', el)
//         throw new Error(`Please provide object of type {eventName:string, eventParams:Object, eventReaction:(eventParams, htmlElement)=>void}`)
//     }
//     //DomeEventDispatcher.subscribeToEvent(el, x.eventName, x.eventParams || {}, x.eventReaction)
//     DomeEventDispatcher.subscribeToEvent({
//         eventName: x.eventName,
//         eventParamsFilter: x.eventParams || {},
//         action: x.eventReaction,
//         unsubscribeWhen: () => DomeManipulator.isInDom(el) == false
//     })
    

// }

const build = (tagName, attrs, children:DocumentFragment) => {
    if(!tagName) {
        console.trace()
        throw new Error('tagName='+tagName)
    }
    // if(children && typeof children !== 'object'){
    //      //console.log('tagName=', tagName, 'attrs=',attrs, 'children=', children)
    //      console.log('tagName=', tagName, 'children=', children, 'typeof children=', typeof children)
    // }
    if(tagName == DocumentFragment){
        //console.warn(filename, 'isDocumentFragment!')
        const el = createElement(tagName)
        el.appendChild(children)
        return el
    }

    //console.log(filename, 'instaceof=', tagName instanceof DomeComponent)
    //console.log(filename, 'has render=', tagName.render)
    //console.log(filename, 'instanceof Object=', tagName instanceof Object)

    if(tagName.prototype && tagName.prototype['__DomeComponent']){
        // we have a DomeComponent
        //console.warn('DomeComponent!')
        try {
            const instance = new tagName(attrs, children) as DomeComponent<any>
            //console.log('instance=', instance)
            if(instance['render'] && DataTypes.isFunction(instance['render'])){


                //#region make ref points to instance, not element
                if(attrs.ref && DataTypes.isFunction(attrs.ref)){
                    attrs.ref(instance)
                }
                //#endregion

                instance['init']()
                
                instance.rootElement = instance['render']()

                //#region subscribe to observable attribute
                for(let attribute of Object.values(attrs)){
                    if(checkIfObservable(attribute)){
                        attribute.eventOnChange.subscribe(() => {
                            //this.update()
                            instance.scheduleUpdate()
                        })
                    }
                }
                //#endregion


                //requestAnimationFrame(() => {
                    instance['afterRender']()
                //})

                return instance.rootElement
            }
        } catch(error){
            console.error('error while creating DomeComponent class', error)
        }
        return;

    }
    if(DataTypes.isFunction(tagName)){
        // call functional component
        return tagName(attrs, children)
        
    } else if(DataTypes.isString(tagName)){
        const el = createElement(tagName)
        //console.log('lex-dome', 'creating element', el)

        Object.keys(attrs).forEach(name => {
            const value = attrs[name]
            
            if (name === 'class' || name === 'className' || name === 'cssClasses') {
                //DomeManipulator.setCssClasses(el, value)
                assignDynamicCssClasses(name, value, el) 

                

            } else if (name === 'style') {
                setCSSProps(el, value)

            } else if(['disabled', 'autocomplete', 'selected', 'checked'].indexOf(name) >= 0){
                if(attrs[name]){
                    DomeManipulator.setAttribute(el, name, name)    
                }

            } else if(name === 'onCreate' || name === 'ref'){
                if(DataTypes.isFunction(value) == false) throw new Error(`Please provide function <${tagName} ${name}={ref => myRef=ref} />`)
                value(el)

            // } else if(name === 'onEvent'){ //TODO: remove this!?
            //     // <div onEvent={{eventName:'myCumstomEvent', eventParams:{any:'params',can:'be',here:true}, eventReaction:()=>{}}}>some text for div</div>
            //     //#region is Object
            //     if(Data.isObjectWithKeys(value)){
            //         subscribeToEventByParam(value as OnEventObject, el)
            //         return
            //     }
            //     //#endregion 

            //     //#region is Array
            //     if(Data.isArray(value)){
            //         for(let x of value){
            //             subscribeToEventByParam(x as OnEventObject, el)
            //         }
            //     }
            //     //#endregion

            } else if(name == 'visibleIf'){ //TODO: remove this!?
                if(checkIfObservable(value) == false) {
                    console.error('value=', value)
                    throw new Error('Please provide Observable<boolean> as argument for visibleIf')
                }
                let obs = value as ObservableValue<boolean>
                obs.eventOnChange.subscribe((isVisible) => {
                    if(isVisible){
                        DomeManipulator.unhideElementAsync(el)
                    } else {
                        DomeManipulator.hideElementAsync(el)
                    }
                })

                setTimeout(() => { //TODO: hack to trigger event on mount to DOM
                    obs.eventOnChange.triggerAsync(obs.get())
                }, 1)

            } else if (name.indexOf('on') === 0 && value) {
                const eventName = name.slice(2).toLowerCase()
                if(DataTypes.isFunction(value) == false) {
                    console.error('unable to subscribe for event', eventName, 'listener is not a function', 'element=', el, 'listener=', value)
                    return
                }
                //console.log('adding event listener for', el, 'eventName=', eventName, 'value=', value)
                el.addEventListener(eventName, value)
                
            } else if (name === 'innerHtml') {
                el.innerHTML = value
                
            } else if (name !== 'key' && value !== false) {
                DomeManipulator.setAttribute(el, name, value === true ? '' : value)
            }
        })

        if (!attrs.innerHtml) {
            el.appendChild(children)
        }

        return el
        
    } else throw new Error("not implemented")
}



/**
 * 
 * @param value 
 * @param name 
 * @param element 
 */
function assignDynamicCssClasses(name: string, value: {[key:string]:boolean|ObservableValue<boolean>}, element: any) {
    if (DataTypes.isObjectWithKeys(value) == false){
        DomeManipulator.setCssClasses(element, value)
        return
        //throw new Error(`Please provide object for ${name}, ex: {class1:true, class2:myVarO}`)
    }
    let resultArray: string[] = []
    for (let [k, v] of Object.entries(value)) {
        if (DataTypes.isBoolean(v)) {
            if(v){
                resultArray.push(k)
            }

        } else if (checkIfObservable(v)) {
            let o = v as ObservableValue<boolean>
            o.eventOnChange.subscribe((showThiCssClass) => {
                if(!DomeManipulator.isInDom(element)) return {unsubscribe:true} //TODO: test it
                // reassign whole attribute
                DomeManipulator.setCssClasses(element, value)
            })
            if (o.get()) {
                resultArray.push(k)
            }
        } else {
            console.error(`Please provide classNames as a keys and boolean or Observable<boolean> for values., ex: {class1:true, class2:myVarO}`, 'name=', name, 'value=', value, 'typeof value =', typeof value)
            throw new Error('Wrong value for `class` attribute')
        }
    }
    DomeManipulator.setCssClasses(element, resultArray) // yes, array of classes is ok here
}

export function h(tagName, attrs, ...childrenArgs) {
	// eslint-disable-next-line prefer-rest-params
	//const childrenArgs = [].slice.apply(arguments, [2])
    const children = document.createDocumentFragment()
    //const childArray:any[] = []
    
    // console.log(filename, 'childrenArgs=', childrenArgs)
    // console.log(filename, 'childrenO=', childrenO)
    // if(tagName === 'hoho'){
    //     console.warn(filename, tagName, attrs, ...childrenArgs)
    // }

	flattenArray(childrenArgs).forEach(child => {
    //(childrenArgs).forEach(child => {
        // if(tagName === 'hoho'){
        //     console.warn(filename, 'child=', child)
        // }
		if (child instanceof Node) {
            children.appendChild(child)
            //childArray.push(child)

            // const mountFunction = mountFunctionByNode.get(child)
            // if(mountFunction){
            //     mountFunction(child)
            //     mountFunctionByNode.delete(child)// delete after execution
            // }

		} else if (typeof child !== 'boolean' && typeof child !== 'undefined' && child !== null) {
            //console.log('[Dome] child=', child)
            //console.warn(filename, 'text? child=', child)
            children.appendChild(document.createTextNode(child))
            //childArray.push(document.createTextNode(child))
        }
	})

    //return build(tagName, attrs || {}, children)
    return build(tagName, attrs || {}, children)
}

// Improve TypeScript support for DocumentFragment
// https://github.com/Microsoft/TypeScript/issues/20469
export const React = {
	createElement: h,
	Fragment: typeof DocumentFragment === 'function' ? DocumentFragment : () => {}
}

export default React

