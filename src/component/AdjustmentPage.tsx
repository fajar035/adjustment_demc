import * as React from "react";
import {ReactGrid, Column, Row, CellChange, TextCell} from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";
import {payload} from "./payload.ts";
import {Field} from "./Model.ts";


const getPeople = (): any[] => payload.data.payload.records.map((record) => {
    const person: any = {};
    payload.data.payload.fields.forEach((field: Field, index: number) => person[field.name] = record[index]);
    return person;
});

const getColumns = (): Column[] => payload.data.payload.fields.map((field: Field) => (
        {columnId: field.name, width: 150}
    )
)

const getRows = (people: any[]): Row[] => [
    {
        rowId: "header",
        cells: payload.data.payload.fields.map((field) => ({type: "text", text: field.name}))
    },
    ...people.map<Row>((rows, index: number) => ({
        rowId: index,
        cells: payload.data.payload.fields.map((field) => {
            const value = rows[field.name];
            return {
                type: "text",
                text: value == null ? "" : value.toString()
            };
        })
    }))
];


export const AdjustmentPage = () => {
    const applyChangesToRow = (changes: CellChange<TextCell>[], rows: any[]): any[] => (
        changes.map((change) =>
            rows[change.rowId as number][change.columnId] = change.newCell.text
        )
    );

    // let payloadColumns = payload.data.payload.fields
    // let payloadRows = payload.data.payload.records

    const [people, setPeople] = React.useState<any[]>(getPeople());

    const rows = getRows(people);
    const columns = getColumns();

    const handleChanges: any = (changes: CellChange<TextCell>[]) => {
        const newPeople = [...people];
        applyChangesToRow(changes, newPeople);
        setPeople(newPeople);
    };
    return (
        <>
            <ReactGrid
                rows={rows}
                columns={columns}
                onCellsChanged={handleChanges}
                enableRangeSelection={true}
                enableColumnSelection={true}
                stickyTopRows={1}
            />
        </>
    );
};