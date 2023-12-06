import {CellLocation, Id, MenuOption, SelectionMode} from "@silevis/reactgrid";

export class SetNullMenuOption implements MenuOption {
    id: string = "my-menu-option";
    label: string = "Set Null";

    onChangeHandler: ((args: any[]) => void) | null = null


    constructor(changeHandler: (a: any) => void) {
        this.onChangeHandler = changeHandler;
    }

    handler = (_selectedRowIds: Id[], _selectedColIds: Id[], _selectionMode: SelectionMode, selectedRanges: Array<CellLocation[]>): void => {
        console.log("Selected Ranges This: ", this)
        console.log("Selected Ranges : ", this.onChangeHandler)
        if (this.onChangeHandler == null) return;
        const changes = selectedRanges.map((range) => {
            const _changes = range.map((cell) => ({
                rowId: cell.rowId,
                columnId: cell.columnId,
                newCell: {
                    type: "text",
                    text: null
                }
            }))
            return _changes;
        }).flat();
        this.onChangeHandler(changes);
    }
}