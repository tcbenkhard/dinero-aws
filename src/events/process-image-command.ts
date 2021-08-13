import {SQSRecord} from "aws-lambda";

export interface ProcessImageCommand {
    reference: string,
    imageKey: string,
}

export const toProcessImageCommand = (record: SQSRecord): ProcessImageCommand => {
    const jsonBody = JSON.parse(record.body);
    return {
        reference: jsonBody.reference,
        imageKey: jsonBody.imageKey
    }
}