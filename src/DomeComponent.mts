import { debounce } from 'ts-debounce'
import { Animation } from './Animation.mjs'
import { DomeManipulator } from "./DomeManipulator.mjs"


interface InternalAttrs{
    ref?:(ref)=>void
    onShowAnimation?:Animation
    onHideAnimation?:Animation
}
export abstract class DomeComponent<Attrs>{
    public rootElement!:Element|HTMLElement
    private updateInProgress = false
    private updateRequested = false
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
    private async runScheduledUpdateAsync() {
        if(this.updateInProgress){
            this.updateRequested = true
            return
        }

        this.updateInProgress = true
        try {
            do {
                this.updateRequested = false
                try {
                    await this.updateAsync()
                } catch(error) {
                    console.error('DomeComponent: scheduled update failed', error)
                }
            } while(this.updateRequested)
        } finally {
            this.updateInProgress = false
        }
    }

    scheduleUpdate = debounce(() => this.runScheduledUpdateAsync(), 5)

    protected afterUpdate(){

    }
}
DomeComponent.prototype['__DomeComponent'] = true

// export interface DomeComponent<Attrs>{
//     render:(attrs:Attrs)=>HTMLElement
// }