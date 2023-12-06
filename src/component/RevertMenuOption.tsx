import {CellLocation, Id, MenuOption, SelectionMode} from "@silevis/reactgrid";
import {ChangeItem} from "./ChangeItem.tsx";

export class RevertMenuOption implements MenuOption {
    id: string = "menu-revert";
    label: string = "Revert";

    onChangeHandler: ((args: any[]) => void) | null = null
    changeList: ChangeItem[] = []

    constructor(
        changeHandler: (a: any) => void,
        changeList: ChangeItem[]
    ) {
        this.onChangeHandler = changeHandler;
        this.changeList = changeList;
    }

    handler = (_selectedRowIds: Id[], _selectedColIds: Id[], _selectionMode: SelectionMode, selectedRanges: Array<CellLocation[]>): void => {
        if (this.onChangeHandler == null) return;

        const changes = selectedRanges.flat().map((cell) => {
            const originalCell = this.changeList
                .find((change) => change.row['__index__'] === cell.rowId)
                ?.columns.find((column) => column.title === cell.columnId)

            if (originalCell == null) return null;

            return {
                rowId: cell.rowId,
                columnId: cell.columnId,
                newCell: {type: "text", text: originalCell.original}
            }
        }).filter((change) => change != null) as any[];

        this.onChangeHandler(changes);
    }
}