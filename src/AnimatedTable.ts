import { DomeComponent, AnimatedArray } from "."
import { DomeManipulator } from "./DomeManipulator"
import { Animation } from './Animation'
import {ObservableValue} from '@lexriver/observable'

interface Attrs<T>{
    isLoadingO?:ObservableValue<boolean>
    itemsO:ObservableValue<T[]>
    animationShowRow:Animation
    animationHideRow:Animation
    animationHideTable?:Animation
    animationShowTable?:Animation
    animationHideEmptyList?:Animation
    animationShowEmptyList?:Animation
    animationShowLoading?:Animation
    animationHideLoading?:Animation
    getKey:(item:T)=>string
    rootElement?:HTMLElement
    tableElement?:HTMLElement
    tableBody?:HTMLElement
    renderTableHead?:(items:T[])=>HTMLElement
    renderTableRow:(item:T)=>HTMLElement
    renderTableFooter?:(items:T[]) => HTMLElement
    renderEmptyList:()=>HTMLElement
    renderLoading?:()=>HTMLElement
}

export class AnimatedTable<T> extends DomeComponent<Attrs<T>>{
    // rootElement
    //   table
    //     thead
    //     tbody
    //     tfooter
    //   emptyList
    refRoot:HTMLElement = this.attrs.rootElement || document.createElement('div')
    refTable:HTMLElement = this.attrs.tableElement || document.createElement('table')
    refTableHead:Element = this.attrs.renderTableHead ? this.attrs.renderTableHead(this.attrs.itemsO.get()) : document.createElement('thead')
    refTableBody:HTMLElement = this.attrs.tableBody || document.createElement('tbody')
    refTableFooter:Element = this.attrs.renderTableFooter ? this.attrs.renderTableFooter(this.attrs.itemsO.get()) : document.createElement('tfoot')
    refEmptyList:Element = this.attrs.renderEmptyList ? this.attrs.renderEmptyList() : document.createElement('div')
    refLoading:Element = this.attrs.renderLoading ? this.attrs.renderLoading() : document.createElement('div')
    
    animatedArray = new AnimatedArray<T>({
        animationHide: this.attrs.animationHideRow,
        animationShow: this.attrs.animationShowRow,
        array: [],
        getKey: this.attrs.getKey,
        getHtmlElement: this.attrs.renderTableRow
    })

    render(){
        // refRoot
        //     refTable
        //         refTableHead
        //         refTableBody
        //         refTableFooter
        //     refEmptyListEl
        //     refLoading
        
        this.refRoot.appendChild(this.refTable)
        this.refRoot.appendChild(this.refEmptyList)
        this.refRoot.appendChild(this.refLoading)
        if(this.refTableHead) this.refTable.appendChild(this.refTableHead)
        if(this.refTableBody) this.refTable.appendChild(this.refTableBody)
        if(this.refTableFooter) this.refTable.appendChild(this.refTableFooter)
        console.log('AnimatedTable render()', 'refRoot=', this.refRoot)
        return this.refRoot
    }

    afterRender(){
        this.updateAsync()
        //this.animatedArray.update(this.attrs.items, this.el)
    }

    async updateAsync(){
        if(this.attrs.renderLoading){
            this.refLoading = await DomeManipulator.replaceAsync(this.refLoading, this.attrs.renderLoading())
        }
        if(this.attrs.isLoadingO && this.attrs.isLoadingO.get()){
            // show loading
            await DomeManipulator.unhideElementAsync(this.refLoading, this.attrs.animationShowLoading) 
        } else {
            // hide loading
            await DomeManipulator.hideElementAsync(this.refLoading, this.attrs.animationHideLoading)
        }

        const items = this.attrs.itemsO.get()
        const currentCount = items.length

        if(currentCount == 0){
            // render empty list
            await DomeManipulator.hideElementAsync(this.refTable, this.attrs.animationHideTable)
            if(this.attrs.renderEmptyList){
                this.refEmptyList = await DomeManipulator.replaceAsync(this.refEmptyList, this.attrs.renderEmptyList())
            }
            await DomeManipulator.unhideElementAsync(this.refEmptyList, this.attrs.animationShowEmptyList)
            
        } else {

            // render list with items
            await DomeManipulator.hideElementAsync(this.refEmptyList, this.attrs.animationHideEmptyList)
            if(this.attrs.renderTableHead){
                this.refTableHead = await DomeManipulator.replaceAsync(this.refTableHead, this.attrs.renderTableHead(items))
            }
            if(this.attrs.renderTableFooter){
                this.refTableFooter = await DomeManipulator.replaceAsync(this.refTableFooter, this.attrs.renderTableFooter(items))
            }
            await DomeManipulator.unhideElementAsync(this.refTable, this.attrs.animationShowTable)

            this.animatedArray.update(items, this.refTableBody)
        }



    }
}