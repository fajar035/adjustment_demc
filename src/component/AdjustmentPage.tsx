import * as React from "react";
import {useEffect} from "react";
import {Cell, CellChange, Column, HeaderCell, Id, MenuOption, ReactGrid, Row, SelectionMode, TextCell} from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import {getPayload} from "./payload.ts";
import {Field} from "./Model.ts";
import hash from "object-hash";
import {SetNullMenuOption} from "./SetNullMenuOption.tsx";
import {RevertMenuOption} from "./RevertMenuOption.tsx";
import {ChangeItem} from "./ChangeItem.tsx";


function getObjects(columns: any[], records: any[]): any[] {
    return records.map((record) => {
        const obj: any = {};
        columns.forEach((column, index) => {
            obj[column.name] = record[index];
        })
        obj['__index__'] = records.indexOf(record);
        obj['__hash__'] = hash(JSON.stringify(obj));
        return obj;
    });
}

function getSheetColumns(columns: { name: string }[]): Column[] {
    return columns.map((column: any) => ({columnId: column.name, width: 150}));
}

function getHeaderRow(columns: any[]): Row<Cell> {
    return {
        rowId: "header",
        cells: columns.map((column) => getHeaderCell(column.name))
    }
}

function getHeaderCell(value: any | null): HeaderCell {
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


function getTextCell(
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

function getValueRow(index: number, columns: any[], values: any[], change: ChangeItem | undefined): Row<Cell> {
    return {
        rowId: index,
        cells: columns.map((field): Cell => {
            const columnChange = change?.columns.find((column) => column.title === field.name);
            return getTextCell(values[field.name], change != null, columnChange != null)
        })
    }
}

function getValueRows(columns: any[], values: any[][], changes: ChangeItem[]): Row<Cell>[] {
    return values.map((row, index: number) => {
        const change: ChangeItem | undefined = changes.find((change) => change.row['__index__'] === index);
        return getValueRow(index, columns, row, change)
    })
}

function getSheetValues(columns: { name: string }[], values: any[], changes: ChangeItem[]): Row<Cell>[] {
    return [getHeaderRow(columns), ...getValueRows(columns, values, changes)];
}

function applyChangesToRow(changes: CellChange<TextCell>[], rows: any[]): any[] {
    return changes.map((change) => rows[change.rowId as number][change.columnId] = change.newCell.text)
}

function getContextMenu(changeHandler: (a: any) => void, changeList: ChangeItem[]): (_selectedRowIds: Id[], _selectedColIds: Id[], _selectionMode: SelectionMode, menuOptions: MenuOption[]) => MenuOption[] {
    return (_selectedRowIds: Id[], _selectedColIds: Id[], _selectionMode: SelectionMode, menuOptions: MenuOption[]): MenuOption[] => [
        ...menuOptions,
        new SetNullMenuOption(changeHandler),
        new RevertMenuOption(changeHandler, changeList)
    ]
}

function getChangeHandler(
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
        applyChangesToRow(cellChanges, records);

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

export const AdjustmentPage = () => {
    const [columns, setColumns] = React.useState<Field[]>([])

    const [records, setRecords] = React.useState<any[]>([]);

    const [sheetColumns, setSheetColumns] = React.useState<Column[]>([]);
    const [sheetValues, setSheetValues] = React.useState<Row<Cell>[]>([]);

    const [availableColumns, setAvailableColumns] = React.useState<string[]>([]);
    const [selectedColumns, setSelectedColumns] = React.useState<string[]>([]);
    const [changeList, setChangeList] = React.useState<ChangeItem[]>([]);


    useEffect(() => {
        getPayload().then((payload) => {
            setColumns(payload.data.payload.fields)
            setAvailableColumns(payload.data.payload.fields.map((field) => field.name));
            setRecords(getObjects(payload.data.payload.fields, payload.data.payload.records));
        })
    }, [])

    useEffect(() => {
        const filteredColumns = selectedColumns.length === 0 ? columns : columns.filter((field) => selectedColumns.includes(field.name));
        const sheetColumns = getSheetColumns(filteredColumns);
        const sheetValues = getSheetValues(filteredColumns, records, changeList);

        setSheetColumns(sheetColumns);
        setSheetValues(sheetValues);
    }, [columns, records, selectedColumns, changeList])

    const changeHandler: any = getChangeHandler(
        records,
        changeList,
        (_cellChanges: CellChange<TextCell>[], changeList: ChangeItem[]) => {
            setRecords(records);
            setChangeList(changeList);
        })

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
                {availableColumns.map((column) => (
                    <option key={column}>{column}</option>
                ))}
            </select>

            {records.length > 0 && (
                <ReactGrid
                    rows={sheetValues}
                    columns={sheetColumns}
                    onCellsChanged={changeHandler}
                    enableRangeSelection={true}
                    enableColumnSelection={true}
                    onContextMenu={getContextMenu(changeHandler, changeList)}
                    stickyTopRows={1}

                />
            )}
        </>
    );
};