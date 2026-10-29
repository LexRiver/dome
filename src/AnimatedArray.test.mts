import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AnimatedArray } from './AnimatedArray.mjs'
import type { Animation } from './Animation.mjs'

class FakeElement {
    readonly nodeType = 1
    readonly childNodes:FakeElement[] = []
    readonly classList = {
        values: new Set<string>(),
        add: (name:string) => this.classList.values.add(name),
        remove: (name:string) => this.classList.values.delete(name)
    }
    hidden = false
    readonly style = { display: '' }
    parentNode:FakeElement|null = null

    get lastChild(){
        return this.childNodes[this.childNodes.length - 1] ?? null
    }

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
const asElement = (element:FakeElement) => element as unknown as HTMLElement
const animation = (name:string, timeMs = 5):Animation => ({ cssClassName: name, timeMs })

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

describe('AnimatedArray.update', () => {
    it('clears item state when transitioning to the empty view', async () => {
        const parent = new FakeElement()
        const empty = new FakeElement()
        const elements = new Map<string, FakeElement>()
        const animatedArray = new AnimatedArray<string>({
            getKey: item => item,
            getHtmlElement: item => {
                const element = new FakeElement()
                elements.set(item, element)
                return asElement(element)
            },
            emptyList: asElement(empty)
        })

        await animatedArray.update(['first'], asElement(parent))
        await animatedArray.update([], asElement(parent))

        expect(parent.childNodes).toEqual([empty])
        expect(animatedArray.size).toBe(0)
        expect(elements.get('first')?.parentNode).toBe(null)
    })

    it('serializes overlapping empty and non-empty transitions', async () => {
        const parent = new FakeElement()
        const empty = new FakeElement()
        const first = new FakeElement()
        const latest = new FakeElement()
        const animatedArray = new AnimatedArray<string>({
            getKey: item => item,
            getHtmlElement: item => asElement(item === 'first' ? first : latest),
            emptyList: asElement(empty),
            animationHide: animation('hide', 10)
        })

        await animatedArray.update(['first'], asElement(parent))
        const emptyUpdate = animatedArray.update([], asElement(parent))
        const latestUpdate = animatedArray.update(['latest'], asElement(parent))
        await Promise.all([emptyUpdate, latestUpdate])

        expect(parent.childNodes).toEqual([latest, empty])
        expect(empty.hidden).toBe(true)
        expect(animatedArray.size).toBe(1)
    })

    it('creates each row only when it can be inserted, including mixed patches', async () => {
        const parent = new FakeElement()
        const created:FakeElement[] = []
        const cleanupChecks:Promise<boolean>[] = []
        const animatedArray = new AnimatedArray<string>({
            getKey: item => item,
            getHtmlElement: () => {
                // Previous rows must already be mounted before another row is created.
                for(const element of created){
                    expect(element.parentNode).toBe(parent)
                }
                const element = new FakeElement()
                created.push(element)
                cleanupChecks.push(new Promise<boolean>(resolve => {
                    setTimeout(() => resolve(element.parentNode === parent), 0)
                }))
                return asElement(element)
            },
            animationShow: animation('show', 10),
            animationHide: animation('hide', 10)
        })

        await animatedArray.update(['a', 'b', 'c'], asElement(parent))
        expect(await Promise.all(cleanupChecks)).toEqual([true, true, true])
        const retained = created[1]
        created.length = 0
        cleanupChecks.length = 0

        await animatedArray.update(['x', 'b', 'y'], asElement(parent))
        expect(await Promise.all(cleanupChecks)).toEqual([true, true])
        expect(parent.childNodes).toEqual([created[0], retained, created[1]])
        expect(animatedArray.arrayOfKeyToElement.map(pair => pair.key)).toEqual(['x', 'b', 'y'])
        expect(animatedArray.arrayOfKeyToElement.map(pair => pair.element)).toEqual(parent.childNodes)
    })

    it('keeps the reusable empty view mounted through repeated transitions', async () => {
        const parent = new FakeElement()
        const empty = new FakeElement()
        const animatedArray = new AnimatedArray<string>({
            getKey: item => item,
            getHtmlElement: () => asElement(new FakeElement()),
            emptyList: asElement(empty),
            animationShow: animation('show'),
            animationHide: animation('hide')
        })
        await animatedArray.update([], asElement(parent))
        let detachments = 0
        const remove = empty.remove.bind(empty)
        empty.remove = () => {
            detachments++
            remove()
        }

        for(let cycle = 0; cycle < 3; cycle++){
            await animatedArray.update(['a', 'b'], asElement(parent))
            expect(empty.parentNode).toBe(parent)
            expect(empty.hidden).toBe(true)
            expect(empty.style.display).toBe('none')
            expect(parent.childNodes).toEqual([
                ...animatedArray.arrayOfKeyToElement.map(pair => pair.element), empty
            ])
            await animatedArray.update(['b', 'c'], asElement(parent))
            expect(parent.childNodes).toEqual([
                ...animatedArray.arrayOfKeyToElement.map(pair => pair.element), empty
            ])
            const rows = parent.childNodes.slice(0, -1)
            await animatedArray.update([], asElement(parent))
            expect(parent.childNodes).toEqual([empty])
            expect(rows.every(row => row.parentNode === null)).toBe(true)
            expect(animatedArray.size).toBe(0)
            expect(empty.hidden).toBe(false)
            expect(empty.style.display).toBe('')
        }
        expect(detachments).toBe(0)
    })

    it('resolves only after its animated DOM operations finish', async () => {
        const parent = new FakeElement()
        const child = new FakeElement()
        const animatedArray = new AnimatedArray<string>({
            getKey: item => item,
            getHtmlElement: () => asElement(child),
            animationShow: animation('show', 10)
        })
        let resolved = false

        const update = animatedArray.update(['item'], asElement(parent)).then(() => {
            resolved = true
        })
        await Promise.resolve()
        await Promise.resolve()
        await Promise.resolve()

        expect(resolved).toBe(false)
        expect(child.classList.values.has('show')).toBe(true)

        await update
        expect(resolved).toBe(true)
        expect(child.classList.values.has('show')).toBe(false)
    })
})
