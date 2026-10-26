import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
let popstateHandler:(() => void)|undefined
let DomeRouter:typeof import('./DomeRouter.mjs').DomeRouter

beforeAll(async () => {
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {
            addEventListener(eventName:string, handler:() => void) {
                if(eventName === 'popstate') popstateHandler = handler
            },
            location: { pathname: '/', search: '' },
            history: {
                pushState() {},
                replaceState() {},
                go() {}
            }
        }
    })
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: {
            documentElement: { scrollTop: 0 },
            body: { scrollTop: 0 }
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
    if(originalDocument){
        Object.defineProperty(globalThis, 'document', originalDocument)
    } else {
        delete (globalThis as { document?:unknown }).document
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

        const staleNavigation = DomeRouter.resolveUrl('/generation-slow', false)
        await Promise.resolve()
        await DomeRouter.resolveUrl('/generation-latest', false)

        expect(latestRouteRan).toBe(true)
        expect(staleSignal?.aborted).toBe(true)

        slowRoute.resolve()
        await staleNavigation

        expect(staleFollowUpRan).toBe(false)
    })
})

describe('DomeRouter navigation errors', () => {
    it('returns rejecting promises from resolveUrl and navigate', async () => {
        DomeRouter.onRoute('/reject-resolve', true, async () => {
            throw new Error('resolve failed')
        })
        DomeRouter.onRoute('/reject-navigate', true, async () => {
            throw new Error('navigate failed')
        })

        await expect(DomeRouter.resolveUrl('/reject-resolve', false)).rejects.toThrow('resolve failed')
        await expect(DomeRouter.navigate('/reject-navigate')).rejects.toThrow('navigate failed')
    })

    it('handles and reports route rejection from popstate', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        DomeRouter.onRoute('/reject-popstate', true, async () => {
            throw new Error('popstate failed')
        })
        window.location.pathname = '/reject-popstate'

        popstateHandler?.()
        await Promise.resolve()
        await Promise.resolve()

        expect(consoleError).toHaveBeenCalledWith(
            'DomeRouter popstate navigation failed',
            expect.objectContaining({ message: 'popstate failed' })
        )
        consoleError.mockRestore()
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
