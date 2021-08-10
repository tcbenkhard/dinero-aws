import {BaseHandler, Response} from "./util/handler";
import {APIGatewayProxyEvent} from "aws-lambda";
import {S3} from 'aws-sdk';
import { v4 as uuid } from 'uuid';
import moment = require("moment");

class GetSignedUrlHandler extends BaseHandler<void> {
    private readonly BUCKET_NAME = process.env.IMAGE_BUCKET_NAME;

    async handle(): Promise<Response> {
        const key = `upload/${uuid()}`;
        const expiryDate = moment().add(1, 'hours').unix();
        const signedUrl = await new S3({
            signatureVersion: 'v4'
        }).getSignedUrlPromise('putObject', {
            Bucket: this.BUCKET_NAME,
            Key: key,
            Expires: 60*60 // 1 hour
        });
        console.info('Generated signed URL', signedUrl);
        return Response.ok({
            signedUrl,
            expiryDate,
            key
        });
    }

    validate(event: APIGatewayProxyEvent): void {
    }
}

export const handler = new GetSignedUrlHandler().lambda;