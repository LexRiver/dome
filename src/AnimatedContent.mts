import { ObservableVariable } from '@lexriver/observable'
import { CssClass, DomeManipulator } from './DomeManipulator.mjs'
import { DomeComponent } from './DomeComponent.mjs'

interface Attrs<T>{
    valueO:ObservableVariable<T>
    renderContent:(value:T) => string | Node | null | undefined
    tag?:string
    class?:CssClass
}

export class AnimatedContent<T> extends DomeComponent<Attrs<T>>{
    render(){
        const root = document.createElement(this.attrs.tag || 'span')
        if(this.attrs.class){
            DomeManipulator.setCssClasses(root, this.attrs.class)
        }
        root.appendChild(this.renderContent())
        return root
    }

    private renderContent(){
        // An element wrapper lets text and fragments participate in CSS animations.
        const content = document.createElement('span')
        const value = this.attrs.renderContent(this.attrs.valueO.get())
        if(typeof value === 'string'){
            content.append(value)
        } else if(value){
            content.appendChild(value)
        }
        return content
    }

    async updateAsync(){
        if(!this.rootElement) return
        await DomeManipulator.replaceAllChildrenAsync(
            this.rootElement,
            () => this.renderContent(),
            this.attrs.onHideAnimation,
            this.attrs.onShowAnimation
        )
    }
}
