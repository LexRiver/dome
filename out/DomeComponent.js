import { DomeManipulator } from "./DomeManipulator";
import { debounce } from 'ts-debounce';
export class DomeComponent {
    constructor(attrs, children) {
        //this.init()
        this.attrs = attrs;
        this.children = children;
        this.scheduleUpdate = debounce(() => {
            this.updateAsync();
        }, 5);
    }
    //abstract render(attrs:Attrs, children:any):HTMLElement
    init() { }
    afterRender() {
        //console.log('afterRender(), el=', this.el)
    }
    // protected onMount(){
    // }
    async updateAsync() {
        //console.log('DomeComponent: calling native update() method!') //TODO: remove this
        if (!this.rootElement) {
            console.error('DomeComponent: unable to update, no rootElement', 'this=', this);
            return;
        }
        if (!this.rootElement.parentNode) {
            console.error('DomeComponent: unable to update, no parent for rootElement, not mounted?', 'this=', this);
            return;
        }
        //console.time('browser')
        const newEl = this.render();
        //console.log('DomeComponent: update() newEl=', newEl) //TODO: remove this
        //DomeManipulator.unhideElement(this.el) // if was null before
        await DomeManipulator.replaceAsync(this.rootElement, newEl, this.attrs.onHideAnimation, this.attrs.onShowAnimation);
        this.rootElement = newEl;
        //console.timeEnd('browser')
        this.afterUpdate();
    }
    afterUpdate() {
    }
}
DomeComponent.prototype['__DomeComponent'] = true;
// export interface DomeComponent<Attrs>{
//     render:(attrs:Attrs)=>HTMLElement
// }
