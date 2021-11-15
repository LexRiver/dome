import { DomeManipulator } from "./DomeManipulator";
import { LongestCommonSubsequence } from "./LongestCommonSubsequence";
export class AnimatedArray {
    constructor(params) {
        this.params = params;
        this.arrayOfKeyToElement = [];
        if (params.array && params.parentElement) {
            this.update(params.array);
        }
    }
    get size() {
        return this.arrayOfKeyToElement.length;
    }
    update(array, parentElement) {
        parentElement = parentElement || this.params.parentElement;
        if (!parentElement) {
            console.warn('AnimatedArray unable to update, no parentElement');
            return;
        }
        //let arrayOfKeyToElement:KeyToElementPair[] = []
        let newArrayOfKeys = array.map((item) => this.params.getKey(item));
        let oldArrayOfKeys = this.arrayOfKeyToElement.map(x => x.key);
        LongestCommonSubsequence.getPatchOrdered({
            oldArray: oldArrayOfKeys,
            newArray: newArrayOfKeys,
            onAdd: (index, key) => {
                if (!parentElement)
                    throw new Error('no parent element'); //TODO: remove this
                let itemIndex = newArrayOfKeys.indexOf(key);
                if (itemIndex == -1)
                    throw new Error('no itemIndex'); //TODO: remove this
                let item = array[itemIndex];
                let element = this.params.getHtmlElement(item);
                this.arrayOfKeyToElement.splice(index, 0, { key, element });
                DomeManipulator.insertByIndexAsync(element, index, parentElement, this.params.animationShow);
                //this.insertNewElementWithAnimation(element, index, parentElement)
            },
            onRemove: (index, key) => {
                DomeManipulator.removeElementAsync(this.arrayOfKeyToElement[index].element, this.params.animationHide);
                this.arrayOfKeyToElement.splice(index, 1);
            }
        });
    }
}
