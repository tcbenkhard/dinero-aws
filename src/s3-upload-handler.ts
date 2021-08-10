import {S3Event, S3EventRecord} from "aws-lambda";
import {S3} from "aws-sdk";
const sharp = require('sharp');

class S3UploadHandler {
    private s3: S3 = new S3();
    private readonly SUPPORTED_TYPES = ["image/jpg", "image/jpeg", "image/png", "jpg", "jpeg", "png"];

    public handle = async (event: S3Event) => {
        const promises = event.Records
            .filter(record => record.eventName === 'ObjectCreated:Put')
            .filter(record => record.s3.object.key.startsWith('upload/'))
            .map(this.processRecord)

        await Promise.all(promises);
    }

    private processRecord = async (record: S3EventRecord) => {
        const {ContentType, Body} = await this.s3.getObject({
            Bucket: record.s3.bucket.name,
            Key: record.s3.object.key
        }).promise();

        if (ContentType && this.SUPPORTED_TYPES.includes(ContentType)) {
            console.info(`Handling object with id ${record.s3.object.key}.`)
            const buffer = new Buffer(Body!.toString());
            const newImageBuffer = sharp(buffer)
                .resize({width: 300, height: 150})
                .toBuffer()
            const newKey = record.s3.object.key.replace('upload/', 'images/');
            await this.s3.putObject({
                Bucket: record.s3.bucket.name,
                Key: newKey,
                Body: newImageBuffer
            }).promise()
            await this.removeObject(record);
        } else {
            console.info(`Removing object with id ${record.s3.object.key} due to an invalid content-type of '${ContentType}'`)
            this.removeObject(record);
        }
    }

    private removeObject = async (record: S3EventRecord) => {
        await this.s3.deleteObject({
            Bucket: record.s3.bucket.name,
            Key: record.s3.object.key
        }).promise()
    }
}

export const handler = new S3UploadHandler().handle;