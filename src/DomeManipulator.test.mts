import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DomeManipulator } from './DomeManipulator.mjs'

class FakeElement {
    readonly nodeType = 1
    readonly childNodes:FakeElement[] = []
    readonly classList = {
        values: new Set<string>(),
        add: (name:string) => this.classList.values.add(name),
        remove: (name:string) => this.classList.values.delete(name)
    }
    readonly style:{display:string} = { display: '' }
    hidden = false
    parentNode:FakeElement|null = null

    get children(){
        return this.childNodes
    }

    get firstChild(){
        return this.childNodes[0] ?? null
    }

    appendChild(child:FakeElement){
        child.remove()
        child.parentNode = this
        this.childNodes.push(child)
        return child
    }

    insertBefore(child:FakeElement, reference:FakeElement|null){
        child.remove()
        child.parentNode = this
        if(!reference){
            this.childNodes.push(child)
        } else {
            const index = this.childNodes.indexOf(reference)
            if(index < 0) throw new Error('reference is not a child')
            this.childNodes.splice(index, 0, child)
        }
        return child
    }

    remove(){
        if(!this.parentNode) return
        const index = this.parentNode.childNodes.indexOf(this)
        if(index >= 0) this.parentNode.childNodes.splice(index, 1)
        this.parentNode = null
    }
}

const originalNode = Object.getOwnPropertyDescriptor(globalThis, 'Node')
const asElement = (element:FakeElement) => element as unknown as Element

beforeAll(() => {
    Object.defineProperty(globalThis, 'Node', {
        configurable: true,
        value: { ELEMENT_NODE: 1 }
    })
})

afterAll(() => {
    if(originalNode){
        Object.defineProperty(globalThis, 'Node', originalNode)
    } else {
        delete (globalThis as { Node?:unknown }).Node
    }
})

describe('DomeManipulator.removeAllChildrenAsync', () => {
    it('does not remove children added during the removal animation', async () => {
        const parent = new FakeElement()
        const original = new FakeElement()
        const addedDuringAnimation = new FakeElement()
        parent.appendChild(original)

        const removal = DomeManipulator.removeAllChildrenAsync(
            asElement(parent),
            { cssClassName: 'hide', timeMs: 10 }
        )
        await new Promise<void>(resolve => setTimeout(resolve, 1))
        parent.appendChild(addedDuringAnimation)
        await removal

        expect(parent.childNodes).toEqual([addedDuringAnimation])
        expect(original.parentNode).toBe(null)
    })
})

describe('DomeManipulator.insertByIndexAsync', () => {
    it('inserts index zero before the existing first child', async () => {
        const parent = new FakeElement()
        const first = new FakeElement()
        const second = new FakeElement()
        const inserted = new FakeElement()
        parent.appendChild(first)
        parent.appendChild(second)

        await DomeManipulator.insertByIndexAsync(asElement(inserted), 0, asElement(parent))

        expect(parent.childNodes).toEqual([inserted, first, second])
    })

    it('inserts before the child currently at a nonzero index', async () => {
        const parent = new FakeElement()
        const first = new FakeElement()
        const second = new FakeElement()
        const inserted = new FakeElement()
        parent.appendChild(first)
        parent.appendChild(second)

        await DomeManipulator.insertByIndexAsync(asElement(inserted), 1, asElement(parent))

        expect(parent.childNodes).toEqual([first, inserted, second])
    })
})
