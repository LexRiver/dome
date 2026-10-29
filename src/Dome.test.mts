import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

class FakeNode {
    static readonly ELEMENT_NODE = 1
    parentNode:FakeNode|null = null
    readonly childNodes:FakeNode[] = []

    get firstChild(){
        return this.childNodes[0] ?? null
    }

    appendChild(child:FakeNode){
        if(child instanceof FakeDocumentFragment){
            for(const node of [...child.childNodes]) this.appendChild(node)
            return child
        }
        child.remove()
        child.parentNode = this
        this.childNodes.push(child)
        return child
    }

    textContent = ''

    append(text:string){
        this.textContent += text
    }

    replaceChild(child:FakeNode, oldChild:FakeNode){
        const index = this.childNodes.indexOf(oldChild)
        oldChild.parentNode = null
        child.parentNode = this
        this.childNodes[index] = child
        return oldChild
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
    it('renders AnimatedContent strings and empty values without animations', async () => {
        vi.useFakeTimers()
        try {
            const [{ h }, { AnimatedContent }, { ObservableVariable }] = await Promise.all([
                import('./Dome.mjs'), import('./AnimatedContent.mjs'), import('@lexriver/observable')
            ])
            const valueO = new ObservableVariable<string | null | undefined>('initial')
            const root = h(AnimatedContent, {
                valueO,
                renderContent: value => value
            }) as unknown as FakeElement
            body.appendChild(root)
            await vi.runAllTimersAsync()
            expect(root.firstChild?.textContent).toBe('initial')
            for(const value of ['<b>literal text</b>', null, undefined, 'latest']){
                valueO.set(value)
                await vi.runAllTimersAsync()
                expect(root.childNodes).toHaveLength(1)
                expect(root.firstChild?.textContent).toBe(value ?? '')
                expect(root.firstChild?.childNodes).toHaveLength(0)
            }
            root.remove()
            mutationObservers.forEach(observer => observer.trigger())
            expect(valueO.eventOnChange.countOfSubscribers).toBe(0)
        } finally {
            vi.useRealTimers()
        }
    })
    it('mounts fresh AnimatedContent fragments after hiding and cleans up their subscriptions', async () => {
        vi.useFakeTimers()
        try {
            const [{ h }, { AnimatedContent }, { ObservableVariable }] = await Promise.all([
                import('./Dome.mjs'), import('./AnimatedContent.mjs'), import('@lexriver/observable')
            ])
            const valueO = new ObservableVariable('initial')
            const visibleO = new ObservableVariable(true)
            const rendered:string[] = []
            const children:FakeElement[] = []
            const root = h(AnimatedContent, {
                valueO,
                renderContent: (value:string) => {
                    rendered.push(value)
                    const child = h('button', {visibleIf: visibleO}) as unknown as FakeElement
                    children.push(child)
                    const fragment = document.createDocumentFragment()
                    fragment.appendChild(child as unknown as Node)
                    return fragment
                },
                onHideAnimation: {cssClassName: 'hide', timeMs: 20},
                onShowAnimation: {cssClassName: 'show', timeMs: 20}
            }) as unknown as FakeElement
            body.appendChild(root)
            await vi.runAllTimersAsync()
            for(const value of ['first', 'second', 'third']){
                valueO.set(value)
                await vi.advanceTimersByTimeAsync(5)
                expect(rendered).not.toContain(value)
                await vi.advanceTimersByTimeAsync(20)
                expect(rendered[rendered.length - 1]).toBe(value)
                const wrapper = root.firstChild as FakeElement
                expect(wrapper.classList.values.has('show')).toBe(true)
                expect(wrapper.firstChild).toBe(children[children.length - 1])
                mutationObservers.forEach(observer => observer.trigger())
                await vi.runAllTimersAsync()
                expect(valueO.eventOnChange.countOfSubscribers).toBe(1)
                expect(visibleO.eventOnChange.countOfSubscribers).toBe(1)
                visibleO.set(false)
                await vi.runAllTimersAsync()
                expect(children[children.length - 1].hidden).toBe(true)
                visibleO.set(true)
                await vi.runAllTimersAsync()
                expect(children[children.length - 1].hidden).toBe(false)
            }
            root.remove()
            mutationObservers.forEach(observer => observer.trigger())
            expect(valueO.eventOnChange.countOfSubscribers).toBe(0)
            expect(visibleO.eventOnChange.countOfSubscribers).toBe(0)
        } finally {
            vi.useRealTimers()
        }
    })
    it.each([false, true])('keeps AnimatedText subscribed across repeated updates (animations: %s)', async animations => {
        vi.useFakeTimers()
        try {
            const [{ h }, { AnimatedText }, { ObservableVariable }] = await Promise.all([
                import('./Dome.mjs'),
                import('./AnimatedText.mjs'),
                import('@lexriver/observable')
            ])
            const textO = new ObservableVariable('initial')
            const initialSubscriberCount = textO.eventOnChange.countOfSubscribers
            const root = h(AnimatedText, {
                textO,
                onHideAnimation: animations ? { cssClassName: 'hide', timeMs: 20 } : undefined,
                onShowAnimation: animations ? { cssClassName: 'show', timeMs: 20 } : undefined
            }) as unknown as FakeElement
            body.appendChild(root)
            await vi.runAllTimersAsync()

            for(const text of ['first', 'second', 'third']){
                textO.set(text)
                await vi.advanceTimersByTimeAsync(5)
                if(animations){
                    expect(root.classList.values.has('hide')).toBe(true)
                    await vi.advanceTimersByTimeAsync(20)
                    expect(root.textContent).toBe(text)
                    expect(root.classList.values.has('show')).toBe(true)
                }
                await vi.runAllTimersAsync()
                mutationObservers.forEach(observer => observer.trigger())
                expect(body.childNodes).toContain(root)
                expect(root.textContent).toBe(text)
                expect(root.classList.values.size).toBe(0)
                expect(textO.eventOnChange.countOfSubscribers).toBe(initialSubscriberCount + 1)
            }

            root.remove()
            mutationObservers.forEach(observer => observer.trigger())
            expect(textO.eventOnChange.countOfSubscribers).toBe(initialSubscriberCount)
            textO.set('after unmount')
            await vi.runAllTimersAsync()
            expect(root.textContent).toBe('third')
        } finally {
            vi.useRealTimers()
        }
    })
    it.each([false, true])('follows default component root replacements (animations: %s)', async animations => {
        vi.useFakeTimers()
        try {
            const [{ h }, { DomeComponent }, { ObservableVariable }] = await Promise.all([
                import('./Dome.mjs'), import('./DomeComponent.mjs'), import('@lexriver/observable')
            ])
            const value = new ObservableVariable('initial')
            const initialCount = value.eventOnChange.countOfSubscribers
            class ReplacingComponent extends DomeComponent<{value:typeof value}> {
                render():HTMLElement {
                    const element = new FakeElement()
                    element.textContent = this.attrs.value.get()
                    return element as unknown as HTMLElement
                }
            }
            let component!:ReplacingComponent
            const root = h(ReplacingComponent, {
                value,
                ref: instance => { component = instance },
                onHideAnimation: animations ? {cssClassName: 'hide', timeMs: 20} : undefined,
                onShowAnimation: animations ? {cssClassName: 'show', timeMs: 20} : undefined
            }) as unknown as FakeElement
            body.appendChild(root)
            await vi.runAllTimersAsync()
            for(const text of ['first', 'second', 'third']){
                const previousRoot = component.rootElement
                value.set(text)
                await vi.advanceTimersByTimeAsync(animations ? 25 : 5)
                mutationObservers.forEach(observer => observer.trigger())
                expect(component.rootElement).not.toBe(previousRoot)
                expect(component.rootElement.textContent).toBe(text)
                expect(value.eventOnChange.countOfSubscribers).toBe(initialCount + 1)
                await vi.runAllTimersAsync()
            }
            component.rootElement.remove()
            mutationObservers.forEach(observer => observer.trigger())
            expect(value.eventOnChange.countOfSubscribers).toBe(initialCount)
            value.set('unmounted')
            await vi.runAllTimersAsync()
            expect(component.rootElement.textContent).toBe('third')
        } finally {
            vi.useRealTimers()
        }
    })

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
