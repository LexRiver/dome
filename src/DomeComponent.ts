import { DomeManipulator } from "./DomeManipulator"
import { Animation } from './Animation'
import {debounce } from 'ts-debounce'


interface InternalAttrs{
    ref?:(ref)=>void
    onShowAnimation?:Animation
    onHideAnimation?:Animation
}
export abstract class DomeComponent<Attrs>{
    public rootElement!:Element|HTMLElement
    constructor(
        public attrs:Attrs & InternalAttrs, 
        public children:any
    ){
        //this.init()

    }
    //abstract render(attrs:Attrs, children:any):HTMLElement
    protected init():void{}
    protected abstract render():HTMLElement
    protected afterRender():void{
        //console.log('afterRender(), el=', this.el)
    }
    // protected onMount(){
         
    // }

    async updateAsync(){
        //console.log('DomeComponent: calling native update() method!') //TODO: remove this
        if(!this.rootElement) {
            console.error('DomeComponent: unable to update, no rootElement', 'this=', this)
            return
        }
        if(!this.rootElement.parentNode){
            console.error('DomeComponent: unable to update, no parent for rootElement, not mounted?', 'this=', this)
            return
        }
        
        //console.time('browser')
        const newEl = this.render()
        //console.log('DomeComponent: update() newEl=', newEl) //TODO: remove this
        //DomeManipulator.unhideElement(this.el) // if was null before
        await DomeManipulator.replaceAsync(this.rootElement, newEl, this.attrs.onHideAnimation, this.attrs.onShowAnimation)
        this.rootElement = newEl
        //console.timeEnd('browser')
        this.afterUpdate()
        
    }
    scheduleUpdate = debounce(() => {
        this.updateAsync()
    }, 5)

    protected afterUpdate(){

    }
}
DomeComponent.prototype['__DomeComponent'] = true

// export interface DomeComponent<Attrs>{
//     render:(attrs:Attrs)=>HTMLElement
// }