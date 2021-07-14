export declare module LongestCommonSubsequence {
    function getLongestCommonSubsequence(set1: string[], set2: string[]): string[];
    function getPatch({ oldArray, newArray, onRemove, onAdd }: {
        oldArray: string[];
        newArray: string[];
        onRemove: (index: number, item: string) => void;
        onAdd: (index: number, item: string) => void;
    }): number;
    function getPatchOrdered({ oldArray, newArray, onRemove, onAdd }: {
        oldArray: string[];
        newArray: string[];
        onRemove: (index: number, item: string) => void;
        onAdd: (index: number, item: string) => void;
    }): number;
}
