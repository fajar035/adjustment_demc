import * as React from "react";
import {ReactGrid, Column, Row, CellChange, TextCell} from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import {getPayload} from "./payload.ts";
import {useEffect} from "react";
import {ServiceResponse} from "./Model.ts";
import hash from "object-hash";


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

export const AdjustmentPage = () => {
    const applyChangesToRow = (changes: CellChange<TextCell>[], rows: any[]): any[] => (
        changes.map((change) =>
            rows[change.rowId as number][change.columnId] = change.newCell.text
        )
    );

    const [payload, setPayload] = React.useState<ServiceResponse>({data: {payload: {fields: [], records: []}}});

    const [objects, setObjects] = React.useState<any[]>([]);
    const [rows, setRows] = React.useState<Row[]>([]);

    const [availableColumns, setAvailableColumns] = React.useState<string[]>([]);
    const [columns, setColumns] = React.useState<Column[]>([]);

    const [selectedColumns, setSelectedColumns] = React.useState<string[]>([]);

    const [objectChanges, setObjectChanges] = React.useState<any[]>([]);


    useEffect(() => {
        getPayload().then((payload) => {
            setPayload(payload);
            const objects = getObjects(payload.data.payload.fields, payload.data.payload.records)
            setObjects(objects);
        })
    }, [])

    useEffect(() => {
        setAvailableColumns(payload.data.payload.fields.map((field) => field.name));

        if (payload != null) {
            let filteredColumns = payload.data.payload.fields.filter((field) => selectedColumns.includes(field.name));

            if (selectedColumns.length === 0) {
                filteredColumns = payload.data.payload.fields;
            }

            const columns = getColumns(filteredColumns);
            const rows = getRows(filteredColumns, objects);

            setColumns(columns);
            setRows(rows);
        }
    }, [objects, selectedColumns])

    const handleChanges: any = (changes: CellChange<TextCell>[]) => {
        const object = [...objects];

        const _changes = new Set(changes.map((change) => change.rowId as number))

        let newObjectChanges = [...objectChanges];
        applyChangesToRow(changes, object);
        setObjects(object);

        _changes.forEach((change) => {
            const clone = {...objects[change]}
            delete clone['__hash__'];

            console.log("New Object Changes : ", newObjectChanges)
            const existingChange = newObjectChanges.find((change) => change['__index__'] === clone['__index__'])

            console.log("New Object Changes : ", newObjectChanges)

            if (objects[change]['__hash__'] !== hash(JSON.stringify(clone))) {
                console.log("Hash Not Match")
                console.log("Existing Change : ", existingChange)
                if (existingChange != null || existingChange != undefined) {
                    console.log("Update")
                    const listIndex = newObjectChanges.indexOf(existingChange);
                    newObjectChanges[listIndex] = clone;
                } else {
                    console.log("Insert")
                    newObjectChanges = [...newObjectChanges, clone];
                }
            } else {
                console.log("Hash Match")
                console.log("Delete")
                const listIndex = newObjectChanges.indexOf(existingChange);
                newObjectChanges.splice(listIndex, 1)
            }
        })

        setObjectChanges(newObjectChanges);

    };
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
                    stickyTopRows={1}
                />
            )}
        </>
    );
};