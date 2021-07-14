import { ObservableValue } from "@lexriver/observable";
import { DomeComponent } from ".";
import { CssClass } from "./DomeManipulator";
interface Attrs {
    textO: ObservableValue<string>;
    tag?: string;
    class?: CssClass;
}
export declare class AnimatedText extends DomeComponent<Attrs> {
    render(): HTMLElement;
    updateAsync(): Promise<void>;
}
export {};
