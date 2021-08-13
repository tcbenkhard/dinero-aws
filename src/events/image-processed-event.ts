import {SQSRecord} from "aws-lambda";

export interface ImageProcessedEvent {
    reference: string,
    imageUrl: string
}

export const toImageProcessedEvent = (event: SQSRecord): ImageProcessedEvent => {
    const jsonBody = JSON.parse(event.body);
    console.log('Parsed event: ', jsonBody);
    const message = JSON.parse(jsonBody.Message);
    return {
        reference: message.reference,
        imageUrl: message.imageUrl
    }
}