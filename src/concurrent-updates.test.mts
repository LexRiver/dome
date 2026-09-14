import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { DomeComponent } from './DomeComponent.mjs'
import { DomeManipulator } from './DomeManipulator.mjs'
import type { Animation } from './Animation.mjs'

class FakeElement {
    readonly nodeType = 1
    readonly childNodes: FakeElement[] = []
    readonly classList = {
        values: new Set<string>(),
        add: (name:string) => this.classList.values.add(name),
        remove: (name:string) => this.classList.values.delete(name)
    }
    parentNode: FakeElement | null = null
    throwOnAppend = false

    get firstChild() {
        return this.childNodes[0] ?? null
    }

    appendChild(child:FakeElement) {
        if(child.throwOnAppend){
            throw new Error('append failed')
        }
        child.parentNode = this
        this.childNodes.push(child)
        return child
    }

    remove() {
        if(!this.parentNode) return
        const index = this.parentNode.childNodes.indexOf(this)
        if(index >= 0){
            this.parentNode.childNodes.splice(index, 1)
        }
        this.parentNode = null
    }
}

const asElement = (element:FakeElement) => element as unknown as Element
const animation = (name:string):Animation => ({ cssClassName: name, timeMs: 5 })
const waitAsync = (timeMs:number) => new Promise<void>(resolve => setTimeout(resolve, timeMs))

async function waitForAsync(condition:() => boolean) {
    const timeoutAt = Date.now() + 500
    while(!condition()){
        if(Date.now() >= timeoutAt){
            throw new Error('Timed out waiting for condition')
        }
        await waitAsync(1)
    }
}

function deferred() {
    let resolve!:() => void
    const promise = new Promise<void>(resolvePromise => {
        resolve = resolvePromise
    })
    return { promise, resolve }
}

const originalNode = Object.getOwnPropertyDescriptor(globalThis, 'Node')

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

describe('DomeManipulator.replaceAllChildrenAsync', () => {
    async function expectLastQueuedReplacement(
        animationForHide?:Animation,
        animationForShow?:Animation
    ) {
        const container = new FakeElement()
        const existing = new FakeElement()
        const first = new FakeElement()
        const second = new FakeElement()
        container.appendChild(existing)

        await Promise.all([
            DomeManipulator.replaceAllChildrenAsync(asElement(container), asElement(first), animationForHide, animationForShow),
            DomeManipulator.replaceAllChildrenAsync(asElement(container), asElement(second), animationForHide, animationForShow)
        ])

        expect(container.childNodes).toEqual([second])
    }

    it('serializes two concurrent replacements without animations', async () => {
        await expectLastQueuedReplacement()
    })

    it('serializes concurrent replacements with a hide animation', async () => {
        await expectLastQueuedReplacement(animation('hide'))
    })

    it('serializes concurrent replacements with a show animation', async () => {
        await expectLastQueuedReplacement(undefined, animation('show'))
    })

    it('serializes concurrent replacements with hide and show animations', async () => {
        await expectLastQueuedReplacement(animation('hide'), animation('show'))
    })

    it('runs replacements on different containers independently', async () => {
        const slowContainer = new FakeElement()
        const fastContainer = new FakeElement()
        const oldSlowChild = new FakeElement()
        const slowChild = new FakeElement()
        const fastChild = new FakeElement()
        slowContainer.appendChild(oldSlowChild)

        let slowReplacementFinished = false
        const slowReplacement = DomeManipulator.replaceAllChildrenAsync(
            asElement(slowContainer),
            asElement(slowChild),
            { cssClassName: 'hide', timeMs: 30 }
        ).then(() => {
            slowReplacementFinished = true
        })
        await waitAsync(1)

        await DomeManipulator.replaceAllChildrenAsync(asElement(fastContainer), asElement(fastChild))

        expect(fastContainer.childNodes).toEqual([fastChild])
        expect(slowReplacementFinished).toBe(false)
        expect(slowContainer.childNodes).toEqual([oldSlowChild])
        await slowReplacement
    })

    it('does not let a failed replacement block a later replacement', async () => {
        const container = new FakeElement()
        const failingChild = new FakeElement()
        const successfulChild = new FakeElement()
        failingChild.throwOnAppend = true

        const failedReplacement = DomeManipulator.replaceAllChildrenAsync(
            asElement(container),
            asElement(failingChild)
        )
        const queuedReplacement = DomeManipulator.replaceAllChildrenAsync(
            asElement(container),
            asElement(successfulChild)
        )

        await expect(failedReplacement).rejects.toThrow('append failed')
        await queuedReplacement
        expect(container.childNodes).toEqual([successfulChild])
    })
})

class ScheduledTestComponent extends DomeComponent<{}> {
    updateCount = 0
    activeUpdates = 0
    maximumActiveUpdates = 0
    updateBehavior:() => Promise<void> = async () => undefined

    protected render():HTMLElement {
        return {} as HTMLElement
    }

    override async updateAsync() {
        this.updateCount++
        this.activeUpdates++
        this.maximumActiveUpdates = Math.max(this.maximumActiveUpdates, this.activeUpdates)
        try {
            await this.updateBehavior()
        } finally {
            this.activeUpdates--
        }
    }
}

describe('DomeComponent.scheduleUpdate', () => {
    it('debounces repeated requests made before an update starts', async () => {
        const component = new ScheduledTestComponent({}, null)

        await Promise.all([
            component.scheduleUpdate(),
            component.scheduleUpdate(),
            component.scheduleUpdate()
        ])

        expect(component.updateCount).toBe(1)
    })

    it('coalesces requests during an update into exactly one follow-up update', async () => {
        const component = new ScheduledTestComponent({}, null)
        const firstUpdate = deferred()
        component.updateBehavior = () => component.updateCount === 1
            ? firstUpdate.promise
            : Promise.resolve()

        const initialSchedule = component.scheduleUpdate()
        await waitForAsync(() => component.updateCount === 1)
        component.scheduleUpdate()
        component.scheduleUpdate()
        component.scheduleUpdate()
        await waitAsync(10)
        firstUpdate.resolve()
        await initialSchedule

        expect(component.updateCount).toBe(2)
    })

    it('never runs scheduled updates concurrently for one component', async () => {
        const component = new ScheduledTestComponent({}, null)
        const firstUpdate = deferred()
        component.updateBehavior = () => component.updateCount === 1
            ? firstUpdate.promise
            : Promise.resolve()

        const initialSchedule = component.scheduleUpdate()
        await waitForAsync(() => component.updateCount === 1)
        component.scheduleUpdate()
        await waitAsync(10)

        expect(component.maximumActiveUpdates).toBe(1)
        firstUpdate.resolve()
        await initialSchedule
        expect(component.maximumActiveUpdates).toBe(1)
    })

    it('allows subsequent scheduled updates after updateAsync rejects', async () => {
        const component = new ScheduledTestComponent({}, null)
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        component.updateBehavior = async () => {
            if(component.updateCount === 1){
                throw new Error('update failed')
            }
        }

        try {
            await component.scheduleUpdate()
            await component.scheduleUpdate()
        } finally {
            consoleError.mockRestore()
        }

        expect(component.updateCount).toBe(2)
        expect(component.maximumActiveUpdates).toBe(1)
    })
})
