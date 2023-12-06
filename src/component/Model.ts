export interface ServiceResponse {
    data: Data
}

export interface Data {
    payload: Payload
}

export interface Payload {
    fields: Field[]
    records: string[][]
}

export interface Field {
    name: string
    type: string
    nullable: boolean
}
