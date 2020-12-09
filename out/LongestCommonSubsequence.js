export var LongestCommonSubsequence;
(function (LongestCommonSubsequence) {
    // https://github.com/trekhleb/javascript-algorithms/tree/master/src/algorithms/sets/longest-common-subsequence
    function getLongestCommonSubsequence(set1, set2) {
        // Init LCS matrix.
        const lcsMatrix = Array(set2.length + 1).fill(null).map(() => Array(set1.length + 1).fill(null));
        // Fill first row with zeros.
        for (let columnIndex = 0; columnIndex <= set1.length; columnIndex += 1) {
            lcsMatrix[0][columnIndex] = 0;
        }
        // Fill first column with zeros.
        for (let rowIndex = 0; rowIndex <= set2.length; rowIndex += 1) {
            lcsMatrix[rowIndex][0] = 0;
        }
        // Fill rest of the column that correspond to each of two strings.
        for (let rowIndex = 1; rowIndex <= set2.length; rowIndex += 1) {
            for (let columnIndex = 1; columnIndex <= set1.length; columnIndex += 1) {
                if (set1[columnIndex - 1] === set2[rowIndex - 1]) {
                    lcsMatrix[rowIndex][columnIndex] = lcsMatrix[rowIndex - 1][columnIndex - 1] + 1;
                }
                else {
                    lcsMatrix[rowIndex][columnIndex] = Math.max(lcsMatrix[rowIndex - 1][columnIndex], lcsMatrix[rowIndex][columnIndex - 1]);
                }
            }
        }
        // Calculate LCS based on LCS matrix.
        if (!lcsMatrix[set2.length][set1.length]) {
            // If the length of largest common string is zero then return empty string.
            return [''];
        }
        const longestSequence = [];
        let columnIndex = set1.length;
        let rowIndex = set2.length;
        while (columnIndex > 0 || rowIndex > 0) {
            if (set1[columnIndex - 1] === set2[rowIndex - 1]) {
                // Move by diagonal left-top.
                longestSequence.unshift(set1[columnIndex - 1]);
                columnIndex -= 1;
                rowIndex -= 1;
            }
            else if (lcsMatrix[rowIndex][columnIndex] === lcsMatrix[rowIndex][columnIndex - 1]) {
                // Move left.
                columnIndex -= 1;
            }
            else {
                // Move up.
                rowIndex -= 1;
            }
        }
        return longestSequence;
    }
    LongestCommonSubsequence.getLongestCommonSubsequence = getLongestCommonSubsequence;
    function getPatch({ oldArray, newArray, onRemove, onAdd }) {
        const lcsArray = getLongestCommonSubsequence(oldArray, newArray);
        let countOfOperations = 0;
        // console.log('oldArray=', oldArray.join(' '))
        // console.log('newArray=', newArray.join(' '))
        // console.log('lcsArray=', lcsArray.join(' '))
        // old:   A B B B C
        // new: X X B B B B C
        // lcs:     B B B C
        //let lcsStartIndexForOld = 0
        //let lcsStartIndexForNew = 0
        let lcsIndex = 0;
        //let newIndex = 0
        for (let oldIndex = 0; oldIndex < oldArray.length; oldIndex++) {
            let oldItem = oldArray[oldIndex];
            //let oldItemInLcs = itemInArray(oldItem, lcsArray, lcsStartIndexForOld)
            let oldItemInLcs = lcsArray[lcsIndex] == oldItem;
            //console.log('oldIndex=', oldIndex, 'oldItem=', oldItem, 'in LCS=', oldItemInLcs)
            if (oldItemInLcs) {
                //lcsStartIndexForOld++
                lcsIndex++;
                // so we must keep this element
                //continue
            }
            else {
                onRemove(oldIndex - countOfOperations, oldItem);
                //indexForOperation++
                countOfOperations++;
            }
        }
        lcsIndex = 0;
        for (let newIndex = 0; newIndex < newArray.length; newIndex++) {
            let newItem = newArray[newIndex];
            //let newItemInLcs = itemInArray(newItem, lcsArray, lcsStartIndexForNew)
            let newItemInLcs = lcsArray[lcsIndex] == newItem;
            if (newItemInLcs) {
                lcsIndex++;
                //lcsStartIndexForNew++
                //keep
            }
            else {
                onAdd(newIndex, newItem);
                countOfOperations++;
            }
        }
        return countOfOperations;
    }
    LongestCommonSubsequence.getPatch = getPatch;
    function getPatchOrdered({ oldArray, newArray, onRemove, onAdd }) {
        const lcsArray = getLongestCommonSubsequence(oldArray, newArray);
        //let countOfOperations = 0
        // console.log('oldArray=', oldArray.join(' '))
        // console.log('newArray=', newArray.join(' '))
        // console.log('lcsArray=', lcsArray.join(' '))
        // old:   A B B B C
        // new: X X B B B B C
        // lcs:     B B B C
        let lcsIndexForOld = 0;
        let lcsIndexForNew = 0;
        //let lcsIndex = 0
        let oldIndex = 0;
        let newIndex = 0;
        let countOfRemoveOperations = 0;
        let countOfAddOperations = 0;
        let indexForOperation = 0;
        while (oldIndex < oldArray.length || newIndex < newArray.length) {
            while (oldIndex < oldArray.length) {
                let oldItem = oldArray[oldIndex];
                //let oldItemInLcs = itemInArray(oldItem, lcsArray, lcsStartIndexForOld)
                let oldItemInLcs = lcsArray[lcsIndexForOld] == oldItem;
                //console.log('oldItem', oldIndex, oldItem, oldItemInLcs)
                if (oldItemInLcs) {
                    //lcsStartIndexForNew++
                    //lcsStartIndexForOld++
                    lcsIndexForOld++;
                    //indexForOperation++
                    oldIndex++;
                    break;
                }
                else {
                    //onRemove(oldIndex-countOfRemoveOperations, oldItem)
                    onRemove(indexForOperation, oldItem);
                    countOfRemoveOperations++;
                    oldIndex++;
                }
            }
            while (newIndex < newArray.length) {
                let newItem = newArray[newIndex];
                //let newItemInLcs = itemInArray(newItem, lcsArray, lcsStartIndexForNew)
                let newItemInLcs = lcsArray[lcsIndexForNew] == newItem;
                //console.log('newItem', oldIndex, newItem, newItemInLcs)
                if (newItemInLcs) {
                    //lcsStartIndexForNew++
                    lcsIndexForNew++;
                    indexForOperation++;
                    newIndex++;
                    break;
                }
                else {
                    onAdd(indexForOperation, newItem);
                    indexForOperation++;
                    countOfAddOperations++;
                    newIndex++;
                }
            }
        }
        // console.log('countOf(+)operations', countOfAddOperations)
        // console.log('countOf(-)operations', countOfRemoveOperations)
        return countOfAddOperations + countOfRemoveOperations;
    }
    LongestCommonSubsequence.getPatchOrdered = getPatchOrdered;
})(LongestCommonSubsequence || (LongestCommonSubsequence = {}));
