import * as React from "react";
import {useEffect} from "react";
import {CellChange, Column, Id, MenuOption, ReactGrid, Row, SelectionMode, TextCell} from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import {getPayload} from "./payload.ts";
import {ServiceResponse} from "./Model.ts";
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

function getColumns(columns: any[]): Column[] {
    return columns.map((column: any) => ({columnId: column.name, width: 150}));
}

function getRows(columns: any[], records: any[]): Row[] {
    return [
        {
            rowId: "header",
            cells: columns.map((field) => ({type: "text", text: field.name}))
        },
        ...records.map<Row>((rows, index: number) => ({
            rowId: index,
            cells: columns.map((field) => {
                const value = rows[field.name];
                return {
                    type: "text",
                    text: value == null ? "" : value.toString()
                };
            })
        }))
    ];
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

function getChangeHandler(cellChanges: CellChange<TextCell>[]): void {

}

export const AdjustmentPage = () => {
    const [payload, setPayload] = React.useState<ServiceResponse>({data: {payload: {fields: [], records: []}}});
    const [objects, setObjects] = React.useState<any[]>([]);
    const [rows, setRows] = React.useState<Row[]>([]);
    const [availableColumns, setAvailableColumns] = React.useState<string[]>([]);
    const [columns, setColumns] = React.useState<Column[]>([]);
    const [selectedColumns, setSelectedColumns] = React.useState<string[]>([]);
    const [objectChanges, setObjectChanges] = React.useState<ChangeItem[]>([]);


    useEffect(() => {
        getPayload().then((payload) => {
            setPayload(payload);
            const objects = getObjects(payload.data.payload.fields, payload.data.payload.records)
            setObjects(objects);
        })
    }, [])

    useEffect(() => {
        setAvailableColumns(payload.data.payload.fields.map((field) => field.name));

        let filteredColumns = payload.data.payload.fields.filter((field) => selectedColumns.includes(field.name));

        if (selectedColumns.length === 0) {
            filteredColumns = payload.data.payload.fields;
        }

        const columns = getColumns(filteredColumns);
        const rows = getRows(filteredColumns, objects);

        setColumns(columns);
        setRows(rows);
    }, [objects, selectedColumns])

    const handleChanges: any = (changes: CellChange<TextCell>[]) => {
        const object = [...objects];

        let _changes = changes.map((change) => ({
            index: change.rowId as number,
            column: change.columnId as string,
        }))

        _changes = _changes.filter((change, index, self) =>
                index === self.findIndex((t) => (
                    t.index === change.index && t.column === change.column
                ))
        )


        let newObjectChanges = [...objectChanges];

        const originalObjects = _changes.map((change) => ({...objects[change.index]}))
        console.log("_Changes : ", _changes)
        console.log("Original Objects : ", originalObjects)
        applyChangesToRow(changes, object);

        _changes.forEach((change, index) => {
            console.log("Change : ", change, index)

            const clone = {...object[change.index]}
            delete clone['__hash__'];

            console.log("New Object Changes : ", newObjectChanges)
            const existingChange = newObjectChanges.find((change) => change.row['__index__'] === clone['__index__'])

            if (object[change.index]['__hash__'] !== hash(JSON.stringify(clone))) {
                console.log("Hash Not Match")
                console.log("Existing Change : ", existingChange)
                if (existingChange != null) {
                    console.log("Update")
                    const listIndex = newObjectChanges.map(a => a.row).indexOf(existingChange.row);
                    console.log("Clone : ", clone)
                    console.log("List Index : ", listIndex)

                    console.log("Changes Column :", newObjectChanges[listIndex].row[change.column])
                    console.log("Clone Column :", clone[change.column])

                    const columnIndex = newObjectChanges[listIndex].columns.map(a => a.title).indexOf(change.column)
                    if (newObjectChanges[listIndex].columns[columnIndex]?.original == clone[change.column]) {
                        console.log("Delete Column")
                        const columnListIndex = newObjectChanges[listIndex].columns.map(a => a.title).indexOf(change.column);
                        newObjectChanges[listIndex].columns.splice(columnListIndex, 1)
                    } else {
                        console.log("Update Column")
                        const columnListIndex = newObjectChanges[listIndex].columns.map(a => a.title).indexOf(change.column);
                        if (columnListIndex === -1) {
                            newObjectChanges[listIndex].columns = [...newObjectChanges[listIndex].columns, {
                                title: change.column,
                                original: originalObjects[index][change.column]
                            }]
                        }
                    }
                    newObjectChanges[listIndex].row = clone;
                } else {
                    console.log("Insert")
                    newObjectChanges = [...newObjectChanges, {
                        columns: [{
                            title: change.column,
                            original: originalObjects[index][change.column]
                        }],
                        row: clone
                    }]
                }
            } else {
                console.log("Hash Match")
                console.log("Delete")
                newObjectChanges = newObjectChanges.filter((change) => change.row['__index__'] !== clone['__index__'])
            }
        })
        setObjects(object);
        setObjectChanges(newObjectChanges);

    };

    const simpleHandleContextMenu: any = (_selectedRowIds: Id[], _selectedColIds: Id[], _selectionMode: SelectionMode, menuOptions: MenuOption[]): MenuOption[] => [
        ...menuOptions,
        new SetNullMenuOption(handleChanges),
        new RevertMenuOption(handleChanges, objectChanges)
    ];

    return (
        <>
            <ul>
                {objectChanges.map((change, index) => (
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

            {objects.length > 0 && (
                <ReactGrid
                    rows={rows}
                    columns={columns}
                    onCellsChanged={handleChanges}
                    enableRangeSelection={true}
                    enableColumnSelection={true}
                    onContextMenu={getContextMenu(handleChanges, objectChanges)}
                    stickyTopRows={1}
                />
            )}
        </>
    );
};