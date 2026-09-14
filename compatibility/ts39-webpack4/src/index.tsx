import { DomeComponent, DomeManipulator, React } from '@lexriver/dome'

interface GreetingAttrs {
    name: string
}

class Greeting extends DomeComponent<GreetingAttrs> {
    protected render(): HTMLElement {
        return <div>Hello, {this.attrs.name}!</div>
    }
}

const greeting = <Greeting name="Dome" />
document.body.appendChild(greeting)
DomeManipulator.isInDom(greeting)
