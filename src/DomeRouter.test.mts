import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
let DomeRouter:typeof import('./DomeRouter.mjs').DomeRouter

beforeAll(async () => {
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
            addEventListener() {},
            location: { pathname: '/', search: '' },
            history: {
                pushState() {},
                replaceState() {},
                go() {}
            }
        }
    })
    DomeRouter = (await import('./DomeRouter.mjs')).DomeRouter
})

afterAll(() => {
    if(originalWindow){
        Object.defineProperty(globalThis, 'window', originalWindow)
    } else {
        delete (globalThis as { window?:unknown }).window
    }
})

function deferred() {
    let resolve!:() => void
    const promise = new Promise<void>(resolvePromise => {
        resolve = resolvePromise
    })
    return { promise, resolve }
}

describe('DomeRouter navigation generations', () => {
    it('aborts an older route and prevents its remaining handlers from running', async () => {
        const slowRoute = deferred()
        let staleSignal:AbortSignal|undefined
        let staleFollowUpRan = false
        let latestRouteRan = false

        DomeRouter.onRoute('/generation-slow', true, async (_params, _url, _scroll, _query, signal) => {
            staleSignal = signal
            await slowRoute.promise
        })
        DomeRouter.onRoute('/generation-slow', true, () => {
            staleFollowUpRan = true
        })
        DomeRouter.onRoute('/generation-latest', true, () => {
            latestRouteRan = true
        })

        DomeRouter.resolveUrl('/generation-slow', false)
        await Promise.resolve()
        DomeRouter.resolveUrl('/generation-latest', false)
        await Promise.resolve()

        expect(latestRouteRan).toBe(true)
        expect(staleSignal?.aborted).toBe(true)

        slowRoute.resolve()
        await Promise.resolve()
        await Promise.resolve()

        expect(staleFollowUpRan).toBe(false)
    })
})

describe('DomeRouter route parameter compatibility', () => {
    it('keeps ordinary route parameters as strings', () => {
        const params = DomeRouter.checkUrlMatchRouteAndGetParameters(
            '/product/summer-shoes',
            '/product/:slug'
        ) as {[key:string]:string|number}

        expect(params.slug).toBe('summer-shoes')
        expect(typeof params.slug).toBe('string')
    })

    it.each([
        [':id<int>', '42', 42],
        [':price<float>', '12.5', 12.5],
        [':quantity<number>', '7', 7]
    ])('converts numeric annotation %s', (parameter, input, expected) => {
        const params = DomeRouter.checkUrlMatchRouteAndGetParameters(
            `/value/${input}`,
            `/value/${parameter}`
        ) as {[key:string]:string|number}
        const name = parameter.slice(1, parameter.indexOf('<'))

        expect(params[name]).toBe(expected)
        expect(typeof params[name]).toBe('number')
    })
})
