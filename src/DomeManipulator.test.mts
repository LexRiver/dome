import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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

describe('DomeManipulator.addCssClassAsync', () => {
    it('does not let an older timer remove a class added by a newer call', async () => {
        const element = new FakeElement()

        const olderAdd = DomeManipulator.addCssClassAsync(asElement(element), 'active', 10)
        await new Promise<void>(resolve => setTimeout(resolve, 1))
        const newerAdd = DomeManipulator.addCssClassAsync(asElement(element), 'active', 20)

        await olderAdd
        expect(element.classList.values.has('active')).toBe(true)

        await newerAdd
        expect(element.classList.values.has('active')).toBe(false)
    })
})

describe('DomeManipulator visibility operations', () => {
    it('does not let a stale animated hide win over a newer unhide', async () => {
        const element = new FakeElement()

        const hide = DomeManipulator.hideElementAsync(
            asElement(element),
            { cssClassName: 'hide', timeMs: 10 }
        )
        await new Promise<void>(resolve => setTimeout(resolve, 1))
        await DomeManipulator.unhideElementAsync(asElement(element))
        await hide

        expect(element.hidden).toBe(false)
        expect(element.style.display).toBe('')
    })
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

describe('DomeManipulator.replaceAllChildrenAsync', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('still accepts children directly', async () => {
        const parent = new FakeElement()
        const original = new FakeElement()
        const replacement = new FakeElement()
        parent.appendChild(original)
        const children:DomeManipulator.ChildrenToInsert = [asElement(replacement)]

        await DomeManipulator.replaceAllChildrenAsync(asElement(parent), children)

        expect(parent.childNodes).toEqual([replacement])
        expect(original.parentNode).toBe(null)
    })

    it('calls the factory only after the hide animation and removal', async () => {
        const parent = new FakeElement()
        const original = new FakeElement()
        parent.appendChild(original)
        const factory = vi.fn(() => {
            expect(parent.childNodes).toEqual([])
            expect(original.parentNode).toBe(null)
            const replacement = new FakeElement()
            queueMicrotask(() => {
                expect(parent.childNodes).toEqual([replacement])
            })
            return asElement(replacement)
        })

        const replacement = DomeManipulator.replaceAllChildrenAsync(
            asElement(parent), factory, { cssClassName: 'hide', timeMs: 10 }
        )
        expect(factory).not.toHaveBeenCalled()
        await vi.advanceTimersByTimeAsync(0)
        expect(original.classList.values.has('hide')).toBe(true)
        await vi.advanceTimersByTimeAsync(9)
        expect(factory).not.toHaveBeenCalled()
        expect(parent.childNodes).toEqual([original])

        await vi.advanceTimersByTimeAsync(1)
        await replacement
        expect(factory).toHaveBeenCalledTimes(1)
        expect(parent.childNodes).toEqual([factory.mock.results[0].value])
    })

    it('defers queued content creation until its turn and hide animation finish', async () => {
        const parent = new FakeElement()
        const original = new FakeElement()
        parent.appendChild(original)
        const firstFactory = vi.fn(() => asElement(new FakeElement()))
        const secondFactory = vi.fn(() => {
            expect(parent.childNodes).toEqual([])
            return asElement(new FakeElement())
        })
        const first = DomeManipulator.replaceAllChildrenAsync(
            asElement(parent), firstFactory,
            { cssClassName: 'hide', timeMs: 10 },
            { cssClassName: 'show', timeMs: 20 }
        )
        const second = DomeManipulator.replaceAllChildrenAsync(
            asElement(parent), secondFactory, { cssClassName: 'hide', timeMs: 10 }
        )
        expect(firstFactory).not.toHaveBeenCalled()
        expect(secondFactory).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(10)
        expect(firstFactory).toHaveBeenCalledTimes(1)
        expect(secondFactory).not.toHaveBeenCalled()
        expect(parent.childNodes).toEqual([firstFactory.mock.results[0].value])

        await vi.advanceTimersByTimeAsync(20)
        await first
        expect(secondFactory).not.toHaveBeenCalled()
        expect(parent.firstChild?.classList.values.has('hide')).toBe(true)

        await vi.advanceTimersByTimeAsync(10)
        await second
        expect(secondFactory).toHaveBeenCalledTimes(1)
        expect(parent.childNodes).toEqual([secondFactory.mock.results[0].value])
    })

    it('rejects a throwing factory without blocking the next queued replacement', async () => {
        const parent = new FakeElement()
        const error = new Error('content creation failed')
        const failingFactory = vi.fn(() => { throw error })
        const nextFactory = vi.fn(() => asElement(new FakeElement()))

        const failed = DomeManipulator.replaceAllChildrenAsync(asElement(parent), failingFactory)
        const rejection = expect(failed).rejects.toBe(error)
        const next = DomeManipulator.replaceAllChildrenAsync(asElement(parent), nextFactory)

        await rejection
        await next
        expect(failingFactory).toHaveBeenCalledTimes(1)
        expect(nextFactory).toHaveBeenCalledTimes(1)
        expect(parent.childNodes).toEqual([nextFactory.mock.results[0].value])
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
