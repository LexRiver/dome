import { ObservableValue } from "@lexriver/observable";
import { DomeComponent } from ".";
import { DomeManipulator, CssClass } from "./DomeManipulator";

interface Attrs{
    textO:ObservableValue<string>
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
            this.rootElement = await DomeManipulator.replaceAsync(this.rootElement, this.render(), this.attrs.onHideAnimation, this.attrs.onShowAnimation)
        } catch(x){
            console.error('AnimatedText update failed', x)
        }
    }
}