import { ObservableVariable } from "@lexriver/observable";
import { CssClass, DomeManipulator } from "./DomeManipulator.mjs";
import { DomeComponent } from "./DomeComponent.mjs";

interface Attrs{
    textO:ObservableVariable<string>
    tag?:string
    class?:CssClass
}

export class AnimatedText extends DomeComponent<Attrs>{
    render(){
        //const result = this.attrs.tag ? document.createElement(this.attrs.tag) : document.createElement('span')
        const result = document.createElement(this.attrs.tag || 'span')
        //console.log('AnimatedText', 'this.attrs.class=',this.attrs.class)
        if(this.attrs.class){
            DomeManipulator.setCssClasses(result, this.attrs.class)
        }
        result.append(this.attrs.textO.get())
        return result
    }
    async updateAsync(){
        if(!this.rootElement) return
        try {
            // Observable subscriptions follow this root's lifetime, so keep it mounted.
            const root = this.rootElement
            if(this.attrs.onHideAnimation){
                await DomeManipulator.addCssClassAsync(root, this.attrs.onHideAnimation.cssClassName, this.attrs.onHideAnimation.timeMs)
            }
            root.textContent = this.attrs.textO.get()
            if(this.attrs.onShowAnimation){
                await DomeManipulator.addCssClassAsync(root, this.attrs.onShowAnimation.cssClassName, this.attrs.onShowAnimation.timeMs)
            }
        } catch(x){
            console.error('AnimatedText update failed', x)
        }
    }
}