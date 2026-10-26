import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

class FakeNode {
    parentNode:FakeNode|null = null
    readonly childNodes:FakeNode[] = []

    appendChild(child:FakeNode){
        child.parentNode = this
        this.childNodes.push(child)
        return child
    }
}

class FakeElement extends FakeNode {}
class FakeDocumentFragment extends FakeNode {}

const originalNode = Object.getOwnPropertyDescriptor(globalThis, 'Node')
const originalDocumentFragment = Object.getOwnPropertyDescriptor(globalThis, 'DocumentFragment')
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')

beforeAll(() => {
    Object.defineProperty(globalThis, 'Node', {
        configurable: true,
        value: FakeNode
    })
    Object.defineProperty(globalThis, 'DocumentFragment', {
        configurable: true,
        value: FakeDocumentFragment
    })
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
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
        ['document', originalDocument]
    ] as const){
        if(descriptor){
            Object.defineProperty(globalThis, name, descriptor)
        } else {
            delete (globalThis as Record<string, unknown>)[name]
        }
    }
})

describe('Dome component lifecycle', () => {
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
