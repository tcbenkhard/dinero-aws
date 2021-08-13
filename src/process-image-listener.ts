import {SQSEvent} from "aws-lambda";
import {S3, SNS} from "aws-sdk";
import {ProcessImageCommand, toProcessImageCommand} from "./events/process-image-command";
import {ImageProcessedEvent} from "./events/image-processed-event";

const sharp = require('sharp');

class ProcessImageListener {
    private s3: S3 = new S3();
    private sns: SNS = new SNS();
    private readonly SUPPORTED_TYPES = ["image/jpg", "image/jpeg", "image/png", "jpg", "jpeg", "png"];
    private readonly BUCKET_NAME = process.env.IMAGE_BUCKET_NAME || '';
    private readonly IMAGE_PROCESSED_TOPIC_ARN = process.env.IMAGE_PROCESSED_TOPIC_ARN;

    public handle = async (event: SQSEvent) => {
        const promises = event.Records
            .map(toProcessImageCommand)
            .map(this.processRecord);

        await Promise.all(promises);
    }

    private processRecord = async (command: ProcessImageCommand) => {
        const {ContentType, Body} = await this.s3.getObject({
            Bucket: this.BUCKET_NAME,
            Key: `upload/${command.imageKey}`
        }).promise();

        if (ContentType && this.SUPPORTED_TYPES.includes(ContentType)) {
            console.info(`Handling object with id ${command.imageKey}.`)
            const newImageBuffer = await sharp(Body)
                .resize({width: 300, height: 150})
                .toBuffer();

            const newKey = `images/${command.imageKey}`;
            await this.s3.putObject({
                Bucket: this.BUCKET_NAME,
                Key: newKey,
                Body: newImageBuffer,
                ContentType
            }).promise();
            await this.removeObject(command.imageKey);

            const processedEvent: ImageProcessedEvent = {
                reference: command.reference,
                imageUrl: newKey
            }
            console.log('Image processed: ', processedEvent);
            await this.sns.publish({
                TopicArn: this.IMAGE_PROCESSED_TOPIC_ARN,
                Message: JSON.stringify(processedEvent)
            }).promise();
        } else {
            console.info(`Removing object with id ${command.imageKey} due to an invalid content-type of '${ContentType}'`)
            this.removeObject(command.imageKey);
        }
    }

    private removeObject = async (key: string) => {
        await this.s3.deleteObject({
            Bucket: this.BUCKET_NAME,
            Key: key
        }).promise()
    }
}

export const handler = new ProcessImageListener().handle;