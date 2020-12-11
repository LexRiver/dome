import { LongestCommonSubsequence } from "./LongestCommonSubsequence"

let oldArray = "ABCD".split('')
let newArray = "AXYZBCD345".split('')
const countOfOperations = LongestCommonSubsequence.getPatchOrdered({ 
    oldArray: [...oldArray], 
    newArray: newArray, 
    onRemove: (index, item) => { 
        console.log('-', item, index)
        oldArray.splice(index,1) 
    },  
    onAdd: (index, item) => {
        console.log('+', item, index)
        oldArray.splice(index,0,item)
    }
})
console.log('expecting equal', oldArray, newArray)
console.log('countOfOperations=', countOfOperations)
//expect(oldArray).toEqual(newArray)
// console.log('result oldArray=', oldArray)
// console.log('result nweArray=', newArray)


