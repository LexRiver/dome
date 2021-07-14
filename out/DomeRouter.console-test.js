"use strict";
// //import { DomeRouter } from "./DomeRouter"
// function getRouteSlices(route:string){
//     return route.split('/').filter(x => x.length>0)
// }
// function checkUrlMatchRouteAndGetParameters(url:string, route:string, exactMatch:boolean = true):Map<string,string>|undefined{
//     // this function is purely for export
//     const urlSlices = getRouteSlices(url)
//     const routeSlices = getRouteSlices(route)
//     if(exactMatch && routeSlices.length !== urlSlices.length) return undefined
//     // all routeSlices must match for !exactMatch
//     const extractedParameters = new Map<string,string>()
//     for(let i=0;i<routeSlices.length;i++){
//         let cRouteSlice = routeSlices[i]
//         let cUrlSlice = urlSlices[i] // could be undefined
//         //console.info('\t\t cRouteSlice=', cRouteSlice, 'cUrlSlice=', cUrlSlice)
//         if(cRouteSlice.startsWith(':')){
//             // we have a param name
//             if(cUrlSlice === undefined){
//                 return undefined
//             }
//             // we have some variable, save it
//             extractedParameters.set(cRouteSlice.substring(1), cUrlSlice)
//         } else {
//             // no param name
//             if(cRouteSlice !== cUrlSlice){
//                 return undefined
//             }
//         }
//     }
//     return extractedParameters
// }
// DomeRouter.onRoute('/', true, ()=>{ console.log('exact /')})
// DomeRouter.onRoute('/', false, ()=>{ console.log('notexact /')})
// DomeRouter.onRoute('/test', true, ()=>{ console.log('exact /test')})
// DomeRouter.onRoute('/test/:id', true, (p)=>{ console.log('exact /test/:id', 'params=', p)})    
// DomeRouter.onRoute('/test/:id', false, (p)=>{ console.log('notexact /test/:id', 'params=', p)})    
// DomeRouter.onRoute('/test', false, ()=>{ console.log('notexact /test')})    
// DomeRouter.onRoute('/test/:id/:id2', true, (p)=>{ console.log('exact /test/:id/:id2', 'params=', p)})    
// let testRoute = '//test/34/st'
// console.log('** testing route:', testRoute)
// DomeRouter.execute(testRoute)
// //expect(!true).toBeTruthy()
//console.log(checkUrlMatchRouteAndGetParameters('/get-product/123', '/get-product/:id/:id2', false))
