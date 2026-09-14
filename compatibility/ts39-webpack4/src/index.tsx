import {
    DomeComponent,
    DomeManipulator,
    DomeRouter,
    ObservableValue,
    React
} from '@lexriver/dome'

interface GreetingAttrs {
    name: ObservableValue<string>
}

class Greeting extends DomeComponent<GreetingAttrs> {
    protected render(): HTMLElement {
        return <div>Hello, {this.attrs.name.get()}!</div>
    }
}

const name = new ObservableValue('Dome')
const greeting = <Greeting name={name} />
document.body.appendChild(greeting)
DomeManipulator.isInDom(greeting)
DomeRouter.maxHistoryUrlsCount = 20

function loadProduct(slug: string) {
    return slug
}

interface ProductPageAttrs {
    slug: string
}

class ProductPage extends DomeComponent<ProductPageAttrs> {
    protected render(): HTMLElement {
        return <div>Product: {this.attrs.slug}</div>
    }
}

DomeRouter.onRoute('/product/:slug', true, params => {
    loadProduct(params.slug)
    const page = <ProductPage slug={params.slug} />
    void page
})

DomeRouter.onRoute('/search/:query', true, params => {
    const query: string = params.query
    loadProduct(query)
})

function useNumber(value: number) {
    return value
}

DomeRouter.onTypedRoute('/product/:id<int>', true, params => {
    if(typeof params.id === 'number') useNumber(params.id)
})

DomeRouter.onTypedRoute('/price/:price<float>', true, params => {
    if(typeof params.price === 'number') useNumber(params.price)
})

DomeRouter.onTypedRoute('/quantity/:quantity<number>', true, params => {
    if(typeof params.quantity === 'number') useNumber(params.quantity)
})
