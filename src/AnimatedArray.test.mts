import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
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

afterEach(() => {
    vi.useRealTimers()
})

describe('AnimatedArray.update', () => {
    it('shows all inserted rows concurrently and resolves after one show duration', async () => {
        vi.useFakeTimers()
        const parent = new FakeElement()
        const rows:FakeElement[] = []
        const animatedArray = new AnimatedArray<string>({
            getKey: item => item,
            getHtmlElement: () => {
                const row = new FakeElement()
                rows.push(row)
                return asElement(row)
            },
            animationShow: animation('show', 40)
        })
        let resolved = false
        const update = animatedArray.update(['a', 'b', 'c'], asElement(parent)).then(() => {
            resolved = true
        })
        await vi.advanceTimersByTimeAsync(0)

        expect(rows).toHaveLength(3)
        expect(parent.childNodes).toEqual(rows)
        expect(rows.every(row => row.classList.values.has('show'))).toBe(true)
        expect(resolved).toBe(false)

        await vi.advanceTimersByTimeAsync(39)
        expect(rows.every(row => row.classList.values.has('show'))).toBe(true)
        expect(resolved).toBe(false)

        await vi.advanceTimersByTimeAsync(1)
        expect(resolved).toBe(true)
        expect(rows.every(row => !row.classList.values.has('show'))).toBe(true)
        expect(parent.childNodes).toEqual(rows)
        await update
    })

    it('hides all removed rows concurrently and removes them after one hide duration', async () => {
        vi.useFakeTimers()
        const parent = new FakeElement()
        const animatedArray = new AnimatedArray<string>({
            getKey: item => item,
            getHtmlElement: () => asElement(new FakeElement()),
            animationHide: animation('hide', 60)
        })
        await animatedArray.update(['a', 'b', 'c'], asElement(parent))
        const rows = [...parent.childNodes]
        let resolved = false
        const update = animatedArray.update([], asElement(parent)).then(() => {
            resolved = true
        })
        await vi.advanceTimersByTimeAsync(0)

        expect(animatedArray.size).toBe(0)
        expect(parent.childNodes).toEqual(rows)
        expect(rows.every(row => row.classList.values.has('hide'))).toBe(true)

        await vi.advanceTimersByTimeAsync(59)
        expect(resolved).toBe(false)
        expect(rows.every(row => row.parentNode === parent && row.classList.values.has('hide'))).toBe(true)

        await vi.advanceTimersByTimeAsync(1)
        expect(resolved).toBe(true)
        expect(parent.childNodes).toEqual([])
        expect(rows.every(row => row.parentNode === null && !row.classList.values.has('hide'))).toBe(true)
        await update
    })

    it('keeps logical order and retained row identity while reordered outgoing rows still animate', async () => {
        vi.useFakeTimers()
        const parent = new FakeElement()
        const elements = new Map<string, FakeElement>()
        const animatedArray = new AnimatedArray<string>({
            getKey: item => item,
            getHtmlElement: item => {
                const row = new FakeElement()
                elements.set(item, row)
                return asElement(row)
            },
            animationShow: animation('show', 20),
            animationHide: animation('hide', 70)
        })
        const initialUpdate = animatedArray.update(['a', 'b', 'c', 'd', 'e'], asElement(parent))
        await vi.advanceTimersByTimeAsync(20)
        await initialUpdate
        const original = new Map(elements)
        const outgoing = ['a', 'd', 'e'].map(key => original.get(key)!)
        const keys = ['e', 'x', 'b', 'c', 'y']
        let resolved = false
        const update = animatedArray.update(keys, asElement(parent)).then(() => {
            resolved = true
        })
        await vi.advanceTimersByTimeAsync(0)
        const expectedRows = keys.map(key => elements.get(key)!)
        const inserted = ['e', 'x', 'y'].map(key => elements.get(key)!)

        expect(animatedArray.arrayOfKeyToElement.map(pair => pair.key)).toEqual(keys)
        expect(animatedArray.arrayOfKeyToElement.map(pair => pair.element)).toEqual(expectedRows)
        expect(elements.get('b')).toBe(original.get('b'))
        expect(elements.get('c')).toBe(original.get('c'))
        expect(elements.get('e')).not.toBe(original.get('e'))
        expect(parent.childNodes.filter(row => !outgoing.includes(row))).toEqual(expectedRows)
        expect(outgoing.every(row => row.parentNode === parent && row.classList.values.has('hide'))).toBe(true)
        expect(inserted.every(row => row.classList.values.has('show'))).toBe(true)
        expect(original.get('b')!.classList.values.size).toBe(0)
        expect(original.get('c')!.classList.values.size).toBe(0)

        await vi.advanceTimersByTimeAsync(20)
        expect(inserted.every(row => !row.classList.values.has('show'))).toBe(true)
        expect(outgoing.every(row => row.parentNode === parent && row.classList.values.has('hide'))).toBe(true)
        expect(resolved).toBe(false)

        await vi.advanceTimersByTimeAsync(49)
        expect(resolved).toBe(false)
        await vi.advanceTimersByTimeAsync(1)
        expect(resolved).toBe(true)
        expect(parent.childNodes).toEqual(expectedRows)
        expect(outgoing.every(row => row.parentNode === null)).toBe(true)
        expect(animatedArray.arrayOfKeyToElement[2].element).toBe(original.get('b'))
        expect(animatedArray.arrayOfKeyToElement[3].element).toBe(original.get('c'))
        await update
    })

    it.each([
        { showMs: 20, hideMs: 70 },
        { showMs: 70, hideMs: 20 }
    ])('queues overlapping updates until the longest animation finishes ($showMs show, $hideMs hide)', async ({ showMs, hideMs }) => {
        vi.useFakeTimers()
        const parent = new FakeElement()
        const elements = new Map<string, FakeElement>()
        const animatedArray = new AnimatedArray<string>({
            getKey: item => item,
            getHtmlElement: item => {
                const row = new FakeElement()
                elements.set(item, row)
                return asElement(row)
            },
            animationShow: animation('show', showMs),
            animationHide: animation('hide', hideMs)
        })
        const initialUpdate = animatedArray.update(['old', 'retained'], asElement(parent))
        await vi.advanceTimersByTimeAsync(showMs)
        await initialUpdate
        const old = elements.get('old')!
        const retained = elements.get('retained')!
        let firstResolved = false
        let latestResolved = false
        const firstUpdate = animatedArray.update(['new', 'retained'], asElement(parent)).then(() => {
            firstResolved = true
        })
        const latestUpdate = animatedArray.update(['new', 'retained', 'latest'], asElement(parent)).then(() => {
            latestResolved = true
        })
        await vi.advanceTimersByTimeAsync(0)
        expect(old.classList.values.has('hide')).toBe(true)
        expect(elements.get('new')!.classList.values.has('show')).toBe(true)
        expect(elements.has('latest')).toBe(false)

        const shorter = Math.min(showMs, hideMs)
        const longer = Math.max(showMs, hideMs)
        await vi.advanceTimersByTimeAsync(shorter)
        expect(old.parentNode).toBe(hideMs === shorter ? null : parent)
        expect(elements.get('new')!.classList.values.has('show')).toBe(showMs === longer)
        expect(firstResolved).toBe(false)
        expect(elements.has('latest')).toBe(false)

        await vi.advanceTimersByTimeAsync(longer - shorter - 1)
        expect(firstResolved).toBe(false)
        expect(elements.has('latest')).toBe(false)
        await vi.advanceTimersByTimeAsync(1)
        expect(firstResolved).toBe(true)
        expect(old.parentNode).toBe(null)
        expect(elements.get('new')!.classList.values.has('show')).toBe(false)
        expect(elements.get('latest')!.classList.values.has('show')).toBe(true)
        expect(latestResolved).toBe(false)
        expect(parent.childNodes).toEqual([elements.get('new'), retained, elements.get('latest')])

        await vi.advanceTimersByTimeAsync(showMs - 1)
        expect(latestResolved).toBe(false)
        await vi.advanceTimersByTimeAsync(1)
        expect(latestResolved).toBe(true)
        expect(elements.get('latest')!.classList.values.has('show')).toBe(false)
        await Promise.all([firstUpdate, latestUpdate])
    })

    it('batches empty-list removals before showing the reusable mounted empty view', async () => {
        vi.useFakeTimers()
        const parent = new FakeElement()
        const empty = new FakeElement()
        const animatedArray = new AnimatedArray<string>({
            getKey: item => item,
            getHtmlElement: () => asElement(new FakeElement()),
            emptyList: asElement(empty),
            animationShow: animation('show', 20),
            animationHide: animation('hide', 60)
        })
        await animatedArray.update([], asElement(parent))
        const removeEmpty = vi.spyOn(empty, 'remove')

        for(let cycle = 0; cycle < 2; cycle++){
            const populatedUpdate = animatedArray.update(['a', 'b', 'c'], asElement(parent))
            await vi.advanceTimersByTimeAsync(80)
            await populatedUpdate
            const rows = parent.childNodes.filter(row => row !== empty)
            expect(rows).toHaveLength(3)
            expect(empty.hidden).toBe(true)
            expect(empty.style.display).toBe('none')
            let resolved = false
            const emptyUpdate = animatedArray.update([], asElement(parent)).then(() => {
                resolved = true
            })
            await vi.advanceTimersByTimeAsync(0)
            expect(rows.every(row => row.classList.values.has('hide'))).toBe(true)
            expect(parent.childNodes).toEqual([...rows, empty])
            expect(empty.hidden).toBe(true)
            expect(empty.classList.values.size).toBe(0)

            await vi.advanceTimersByTimeAsync(59)
            expect(rows.every(row => row.parentNode === parent)).toBe(true)
            expect(empty.hidden).toBe(true)
            expect(resolved).toBe(false)
            await vi.advanceTimersByTimeAsync(1)
            expect(rows.every(row => row.parentNode === null)).toBe(true)
            expect(parent.childNodes).toEqual([empty])
            expect(animatedArray.size).toBe(0)
            expect(empty.hidden).toBe(false)
            expect(empty.style.display).toBe('')
            expect(empty.classList.values.has('show')).toBe(true)
            expect(resolved).toBe(false)

            await vi.advanceTimersByTimeAsync(19)
            expect(resolved).toBe(false)
            await vi.advanceTimersByTimeAsync(1)
            expect(resolved).toBe(true)
            expect(empty.classList.values.size).toBe(0)
            expect(empty.parentNode).toBe(parent)
            expect(removeEmpty).not.toHaveBeenCalled()
            await emptyUpdate
        }
    })
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
