import * as React from "react";
import {useEffect} from "react";
import {Cell, CellChange, Column, HeaderCell, Id, MenuOption, ReactGrid, Row, SelectionMode, TextCell} from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import {getPayload} from "./payload.ts";
import {Field} from "./Model.ts";
import hash from "object-hash";
import {SetNullMenuOption} from "./SetNullMenuOption.ts";
import {RevertMenuOption} from "./RevertMenuOption.ts";
import {ChangeItem} from "./ChangeItem.ts";

class TableEditorService {
    columns: Field[] = [];
    visibleColumns: Field[] = [];
    records: any[] = [];

    changeList: ChangeItem[] = [];

    sheetColumns: Column[] = [];

    constructor(columns: Field[], values: any[][]) {
        this.columns = columns;

        this.onVisibleColumnsChanges(columns)

        this.records = this.getRecords(columns, values);
    }

    onVisibleColumnsChanges(columns: Field[]): void {
        this.visibleColumns = columns;
        this.sheetColumns = columns.map((column: any) => ({columnId: column.name, width: 150}));
    }

    getChangeHandler(
        records: any[],
        changeList: ChangeItem[],
        onChanges: (cellChanges: CellChange<TextCell>[], changeList: ChangeItem[]) => void
    ): (cellChanges: CellChange<TextCell>[]) => void {

        return (cellChanges: CellChange<TextCell>[]) => {
            const changes: { index: number, column: string }[] = cellChanges
                .filter((change, index, self) =>
                    index === self.findIndex((t) => t.rowId === change.rowId && t.columnId === change.columnId)
                ).map((change) => ({
                    index: change.rowId as number,
                    column: change.columnId as string,
                }))


            let newObjectChanges = [...changeList];

            const originalObjects = changes.map((change) => ({...records[change.index]}))
            this.applyChangesToRow(cellChanges, records);

            changes.forEach((change, index) => {
                const clone = {...records[change.index]}
                delete clone['__hash__'];

                const existingChange = newObjectChanges.find((change) => change.row['__index__'] === clone['__index__'])

                if (records[change.index]['__hash__'] !== hash(JSON.stringify(clone))) {
                    if (existingChange != null) {
                        const listIndex: number = newObjectChanges.map(a => a.row).indexOf(existingChange.row);
                        const columnIndex: number = newObjectChanges[listIndex].columns.map(a => a.title).indexOf(change.column)

                        if (newObjectChanges[listIndex].columns[columnIndex]?.original == clone[change.column]) {
                            newObjectChanges[listIndex].columns.splice(columnIndex, 1)
                        } else if (columnIndex === -1) {
                            newObjectChanges[listIndex].columns = [...newObjectChanges[listIndex].columns, {
                                title: change.column,
                                original: originalObjects[index][change.column]
                            }]
                        }

                        newObjectChanges[listIndex].row = clone;
                    } else {
                        newObjectChanges = [...newObjectChanges, {
                            columns: [{title: change.column, original: originalObjects[index][change.column]}],
                            row: clone
                        }]
                    }
                } else {
                    newObjectChanges = newObjectChanges.filter((change) => change.row['__index__'] !== clone['__index__'])
                }
            })
            onChanges(cellChanges, newObjectChanges);
        }
    }

    getRecords(columns: any[], records: any[]): any[] {
        return records.map((record) => {
            const obj: any = {};
            columns.forEach((column, index) => obj[column.name] = record[index])
            obj['__index__'] = records.indexOf(record);
            obj['__hash__'] = hash(JSON.stringify(obj));
            return obj;
        });
    }

    getValueRows(columns: any[], values: any[][], changes: ChangeItem[]): Row<Cell>[] {
        return values.map((row, index: number) => {
            const change: ChangeItem | undefined = changes.find((change) => change.row['__index__'] === index);
            return this.getValueRow(index, columns, row, change)
        })
    }

    getSheetValues(changes: ChangeItem[]): Row<Cell>[] {
        return [this.getHeaderRow(this.visibleColumns), ...this.getValueRows(this.visibleColumns, this.records, changes)];
    }

    applyChangesToRow(changes: CellChange<TextCell>[], rows: any[]): any[] {
        return changes.map((change) => rows[change.rowId as number][change.columnId] = change.newCell.text)
    }

    getContextMenu(changeHandler: (a: any) => void, changeList: ChangeItem[]): (_selectedRowIds: Id[], _selectedColIds: Id[], _selectionMode: SelectionMode, menuOptions: MenuOption[]) => MenuOption[] {
        return (_selectedRowIds: Id[], _selectedColIds: Id[], _selectionMode: SelectionMode, menuOptions: MenuOption[]): MenuOption[] => [
            ...menuOptions,
            new SetNullMenuOption(changeHandler),
            new RevertMenuOption(changeHandler, changeList)
        ]
    }

    // getSheetColumns(columns: { name: string }[]): Column[] {
    //     return columns.map((column: any) => ({columnId: column.name, width: 150}));
    // }

    getHeaderCell(value: any | null): HeaderCell {
        return {
            type: "header",
            text: value == null ? "" : value.toString(),
            nonEditable: true,
            style: {
                color: "black",
                background: "lightgray"
            }
        }
    }

    getHeaderRow(columns: any[]): Row<Cell> {
        return {
            rowId: "header",
            cells: columns.map((column) => this.getHeaderCell(column.name))
        }
    }


    getTextCell(
        value: any | null,
        isRowChanged: boolean = false,
        isCellChanged: boolean = false,
    ): TextCell {
        const color = value == null ? "lightgray" : "black";
        let backgroundColor: string | undefined = undefined

        if (isCellChanged) backgroundColor = "blue";
        else if (isRowChanged) backgroundColor = "lightblue";

        return {
            type: "text",
            text: value == null ? "" : value.toString(),
            placeholder: value == null ? "NULL" : value.toString(),
            style: {
                color: color,
                background: backgroundColor
            }
        }
    }

    getValueRow(index: number, columns: any[], values: any[], change: ChangeItem | undefined): Row<Cell> {
        return {
            rowId: index,
            cells: columns.map((field): Cell => {
                const columnChange = change?.columns.find((column) => column.title === field.name);
                return this.getTextCell(values[field.name], change != null, columnChange != null)
            })
        }
    }
}


export const AdjustmentPage = () => {
    const [columns, setColumns] = React.useState<Field[]>([])

    const [sheetValues, setSheetValues] = React.useState<Row<Cell>[]>([]);

    const [selectedColumns, setSelectedColumns] = React.useState<string[]>([]);
    const [changeList, setChangeList] = React.useState<ChangeItem[]>([]);

    const [service, setService] = React.useState<TableEditorService>();

    useEffect(() => {
        getPayload().then((payload) => {
            const service = new TableEditorService(payload.data.payload.fields, payload.data.payload.records);
            setService(service);
            setColumns(payload.data.payload.fields)
        })
    }, [])

    useEffect(() => {
        if (service == null) return;
        const sheetValues = service.getSheetValues(changeList);
        setSheetValues(sheetValues);
    }, [service, columns, selectedColumns, changeList])

    const changeHandler: any = service?.getChangeHandler(
        service?.records,
        changeList,
        (_cellChanges: CellChange<TextCell>[], changeList: ChangeItem[]) => setChangeList(changeList))

    return (
        <>
            <ul>
                {changeList.map((change, index) => (
                    <li key={index}>{JSON.stringify(change)}</li>
                ))}
            </ul>
            <textarea value={"WHERE CIFNUM = '1111111111'"}>

            </textarea>

            <select multiple
                    onChange={(e) => setSelectedColumns(Array.from(e.target.selectedOptions).map((option) => option.value))}>
                {service?.columns.map((column) => (
                    <option key={column.name}>{column.name}</option>
                ))}
            </select>

            {service?.records?.length != undefined && service?.records?.length > 0 && (
                <ReactGrid
                    rows={sheetValues}
                    columns={service?.sheetColumns}
                    onCellsChanged={changeHandler}
                    enableRangeSelection={true}
                    enableColumnSelection={true}
                    onContextMenu={service?.getContextMenu(changeHandler, changeList)}
                    stickyTopRows={1}

                />
            )}
        </>
    );
};