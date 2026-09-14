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
