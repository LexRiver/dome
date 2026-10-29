import { Animation } from './Animation.mjs'
import { DomeManipulator } from "./DomeManipulator.mjs"
import { LongestCommonSubsequence } from "./LongestCommonSubsequence.mjs"

interface KeyToElementPair{
    key:string
    element:HTMLElement
}

export class AnimatedArray<T>{
    arrayOfKeyToElement:KeyToElementPair[] = []
    private updatePromise:Promise<void> = Promise.resolve()

    constructor(protected params:{
        parentElement?:HTMLElement,
        array?:T[], 
        getKey:(o:T)=>string,
        getHtmlElement:(o:T)=>HTMLElement,
        animationShow?:Animation
        animationHide?:Animation
        //renderEmptyList?:()=>HTMLElement
        emptyList?:HTMLElement
    }){
        if(params.array && params.parentElement){
            void this.update(params.array).catch(error => {
                console.error('AnimatedArray initial update failed', error)
            })
        }
    }

    get size():number{
        return this.arrayOfKeyToElement.length
    }

    update(array:T[], parentElement?:HTMLElement|Element):Promise<void>{
        const targetParent = parentElement || this.params.parentElement
        const nextArray = [...array]
        if(!targetParent){
            console.warn('AnimatedArray unable to update, no parentElement')
            return Promise.resolve()
        }

        const update = this.updatePromise
            .catch(() => undefined)
            .then(() => this.performUpdateAsync(nextArray, targetParent))
        this.updatePromise = update
        return update
    }

    private async performUpdateAsync(array:T[], parentElement:HTMLElement|Element):Promise<void>{
        const emptyList = this.params.emptyList
        if(emptyList){
            if(emptyList.parentNode !== parentElement || parentElement.lastChild !== emptyList){
                parentElement.appendChild(emptyList)
            }
            if(array.length == 0){
                for(const child of Array.from(parentElement.childNodes)){
                    if(child !== emptyList){
                        await DomeManipulator.removeElementAsync(child as Element, this.params.animationHide)
                    }
                }
                this.arrayOfKeyToElement = []
                await DomeManipulator.unhideElementAsync(emptyList, this.params.animationShow)
                return
            }
            await DomeManipulator.hideElementAsync(emptyList, this.params.animationHide)
        }

        const operations:Array<() => Promise<void>> = []
        const newArrayOfKeys = array.map((item:T) => this.params.getKey(item))
        const oldArrayOfKeys = this.arrayOfKeyToElement.map(x => x.key)
        LongestCommonSubsequence.getPatchOrdered({
            oldArray: oldArrayOfKeys,
            newArray: newArrayOfKeys,
            onAdd:(index:number, key:string) => {
                const itemIndex = newArrayOfKeys.indexOf(key)
                if(itemIndex == -1) throw new Error('no itemIndex')
                const item = array[itemIndex]
                operations.push(() => {
                    const element = this.params.getHtmlElement(item)
                    this.arrayOfKeyToElement.splice(index, 0, {key, element})
                    return DomeManipulator.insertByIndexAsync(
                        element,
                        index,
                        parentElement,
                        this.params.animationShow
                    )
                })
            },
            onRemove: (index:number) => {
                operations.push(() => {
                    const [{ element }] = this.arrayOfKeyToElement.splice(index, 1)
                    return DomeManipulator.removeElementAsync(element, this.params.animationHide)
                })
            }
        })

        for(const operation of operations){
            await operation()
        }
    }


}