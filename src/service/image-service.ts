import {SQS} from "aws-sdk";
import {ProcessImageCommand} from "../events/process-image-command";

export class ImageService {
    private readonly QUEUE_URL = process.env.PROCESS_IMAGE_COMMAND_QUEUE_URL || '';

    public processImage = async (command: ProcessImageCommand) => {
        await new SQS().sendMessage({
            QueueUrl: this.QUEUE_URL,
            MessageBody: JSON.stringify(command),
        }).promise()
    }
}