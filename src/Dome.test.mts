import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

class FakeNode {
    parentNode:FakeNode|null = null
    readonly childNodes:FakeNode[] = []

    appendChild(child:FakeNode){
        child.remove()
        child.parentNode = this
        this.childNodes.push(child)
        return child
    }

    contains(node:FakeNode):boolean {
        return this === node || this.childNodes.some(child => child.contains(node))
    }

    remove(){
        if(!this.parentNode) return
        const index = this.parentNode.childNodes.indexOf(this)
        if(index >= 0) this.parentNode.childNodes.splice(index, 1)
        this.parentNode = null
    }
}

class FakeElement extends FakeNode {
    readonly nodeType = 1
    readonly style:{display:string} = { display: '' }
    readonly classList = {
        values: new Set<string>(),
        add: (name:string) => this.classList.values.add(name),
        remove: (name:string) => this.classList.values.delete(name)
    }
    hidden = false

    setAttribute() {}
    setAttributeNS() {}
    addEventListener() {}
}
class FakeDocumentFragment extends FakeNode {}

const originalNode = Object.getOwnPropertyDescriptor(globalThis, 'Node')
const originalDocumentFragment = Object.getOwnPropertyDescriptor(globalThis, 'DocumentFragment')
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
const originalMutationObserver = Object.getOwnPropertyDescriptor(globalThis, 'MutationObserver')
const body = new FakeElement()
const documentElement = new FakeElement()
const mutationObservers:FakeMutationObserver[] = []

class FakeMutationObserver {
    disconnected = false

    constructor(private callback:MutationCallback){
        mutationObservers.push(this)
    }

    observe() {}

    disconnect(){
        this.disconnected = true
    }

    trigger(){
        if(!this.disconnected) this.callback([], this as unknown as MutationObserver)
    }
}

beforeAll(() => {
    Object.defineProperty(globalThis, 'Node', {
        configurable: true,
        value: FakeNode
    })
    Object.defineProperty(globalThis, 'DocumentFragment', {
        configurable: true,
        value: FakeDocumentFragment
    })
    Object.defineProperty(globalThis, 'MutationObserver', {
        configurable: true,
        value: FakeMutationObserver
    })
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
            body,
            documentElement,
            createDocumentFragment: () => new FakeDocumentFragment(),
            createElement: () => new FakeElement(),
            createElementNS: () => new FakeElement(),
            createTextNode: () => new FakeNode()
        }
    })
})

afterAll(() => {
    for(const [name, descriptor] of [
        ['Node', originalNode],
        ['DocumentFragment', originalDocumentFragment],
        ['document', originalDocument],
        ['MutationObserver', originalMutationObserver]
    ] as const){
        if(descriptor){
            Object.defineProperty(globalThis, name, descriptor)
        } else {
            delete (globalThis as Record<string, unknown>)[name]
        }
    }
})

describe('Dome component lifecycle', () => {
    it('unsubscribes component observables after the root is detached', async () => {
        const [{ h }, { DomeComponent }, { ObservableVariable }] = await Promise.all([
            import('./Dome.mjs'),
            import('./DomeComponent.mjs'),
            import('@lexriver/observable')
        ])
        const value = new ObservableVariable(1)
        const initialSubscriberCount = value.eventOnChange.countOfSubscribers

        class ObservableComponent extends DomeComponent<{value:typeof value}> {
            protected render():HTMLElement {
                return new FakeElement() as unknown as HTMLElement
            }
        }

        const root = h(ObservableComponent, { value }) as unknown as FakeElement
        body.appendChild(root)
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        expect(value.eventOnChange.countOfSubscribers).toBe(initialSubscriberCount + 1)

        root.remove()
        mutationObservers.forEach(observer => observer.trigger())

        expect(value.eventOnChange.countOfSubscribers).toBe(initialSubscriberCount)
    })

    it('unsubscribes visibleIf observables after the element is detached', async () => {
        const [{ h }, { ObservableVariable }] = await Promise.all([
            import('./Dome.mjs'),
            import('@lexriver/observable')
        ])
        const visible = new ObservableVariable(true)
        const initialSubscriberCount = visible.eventOnChange.countOfSubscribers
        const element = h('div', { visibleIf: visible }) as unknown as FakeElement
        body.appendChild(element)
        await new Promise<void>(resolve => setTimeout(resolve, 0))

        element.remove()
        mutationObservers.forEach(observer => observer.trigger())

        expect(visible.eventOnChange.countOfSubscribers).toBe(initialSubscriberCount)
    })

    it('handles and reports an async afterRender rejection', async () => {
        const [{ h }, { DomeComponent }] = await Promise.all([
            import('./Dome.mjs'),
            import('./DomeComponent.mjs')
        ])
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        class RejectingComponent extends DomeComponent<{}> {
            protected render():HTMLElement {
                return new FakeElement() as unknown as HTMLElement
            }

            protected override async afterRender():Promise<void> {
                throw new Error('afterRender failed')
            }
        }

        h(RejectingComponent, {})
        await Promise.resolve()
        await Promise.resolve()

        expect(consoleError).toHaveBeenCalledWith(
            'DomeComponent afterRender failed',
            expect.objectContaining({ message: 'afterRender failed' })
        )
        consoleError.mockRestore()
    })
})
