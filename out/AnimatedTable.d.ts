import { DomeComponent, AnimatedArray } from ".";
import { Animation } from './Animation';
import { ObservableValue } from '@lexriver/observable';
interface Attrs<T> {
    isLoadingO?: ObservableValue<boolean>;
    itemsO: ObservableValue<T[]>;
    animationShowRow: Animation;
    animationHideRow: Animation;
    animationHideTable?: Animation;
    animationShowTable?: Animation;
    animationHideEmptyList?: Animation;
    animationShowEmptyList?: Animation;
    animationShowLoading?: Animation;
    animationHideLoading?: Animation;
    getKey: (item: T) => string;
    rootElement?: HTMLElement;
    tableElement?: HTMLElement;
    tableBody?: HTMLElement;
    renderTableHead?: (items: T[]) => HTMLElement;
    renderTableRow: (item: T) => HTMLElement;
    renderTableFooter?: (items: T[]) => HTMLElement;
    renderEmptyList: () => HTMLElement;
    renderLoading?: () => HTMLElement;
}
export declare class AnimatedTable<T> extends DomeComponent<Attrs<T>> {
    refRoot: HTMLElement;
    refTable: HTMLElement;
    refTableHead: Element;
    refTableBody: HTMLElement;
    refTableFooter: Element;
    refEmptyList: Element;
    refLoading: Element;
    animatedArray: AnimatedArray<T>;
    render(): HTMLElement;
    afterRender(): void;
    updateAsync(): Promise<void>;
}
export {};
