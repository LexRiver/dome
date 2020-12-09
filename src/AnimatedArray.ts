import { DomeManipulator } from "./DomeManipulator"
import { LongestCommonSubsequence } from "./LongestCommonSubsequence"
import { Animation } from './Animation'

interface KeyToElementPair{
    key:string
    element:HTMLElement
}

export class AnimatedArray<T>{
    arrayOfKeyToElement:KeyToElementPair[] = []

    constructor(protected params:{
        parentElement?:HTMLElement,
        array?:T[], 
        getKey:(o:T)=>string,
        getHtmlElement:(o:T)=>HTMLElement,
        animationShow?:Animation
        animationHide?:Animation
    }){
        if(params.array && params.parentElement){
            this.update(params.array)
        }
    }

    get size():number{
        return this.arrayOfKeyToElement.length
    }

    update(array:T[], parentElement?:HTMLElement|Element){
        parentElement = parentElement || this.params.parentElement
        if(!parentElement){
            console.warn('AnimatedArray unable to update, no parentElement')
            return
        }

        //let arrayOfKeyToElement:KeyToElementPair[] = []
        let newArrayOfKeys = array.map((item:T) => this.params.getKey(item))
        let oldArrayOfKeys = this.arrayOfKeyToElement.map(x => x.key)
        LongestCommonSubsequence.getPatchOrdered({
            oldArray: oldArrayOfKeys,
            newArray: newArrayOfKeys,
            onAdd:(index:number, key:string) => {
                if(!parentElement) throw new Error('no parent element') //TODO: remove this
                let itemIndex = newArrayOfKeys.indexOf(key)
                if(itemIndex == -1) throw new Error('no itemIndex') //TODO: remove this
                let item = array[itemIndex]
                let element = this.params.getHtmlElement(item)
                this.arrayOfKeyToElement.splice(index,0,{key, element})
                DomeManipulator.insertByIndexAsync(element, index, parentElement, this.params.animationShow)
                //this.insertNewElementWithAnimation(element, index, parentElement)

            },
            onRemove: (index:number, key:string) => {
                DomeManipulator.removeElementAsync(this.arrayOfKeyToElement[index].element, this.params.animationHide)
                this.arrayOfKeyToElement.splice(index,1)
            }
        })

    }


}