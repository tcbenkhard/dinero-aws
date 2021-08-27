import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda";
import {ApiError, InternalServerError} from "./error";

export abstract class BaseHandler<T> {
    abstract validate(event: APIGatewayProxyEvent): T;
    abstract handle(request: T, context: Context): Promise<Response>;

    public lambda = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
        try {
            const parsedObject = this.validate(event);
            return await this.handle(parsedObject, context);
        } catch (e) {
            if(e instanceof ApiError) {
                return e;
            } else {
                console.error('Unexpected error occured', e);
                return new InternalServerError();
            }
        }
    }
}

export class Response implements APIGatewayProxyResult {
    body: string;
    statusCode: number;
    headers: {[header: string]: boolean | number | string};

    private constructor(body: string, statusCode: number, headers?: {[header: string]: boolean | number | string} | undefined ) {
        this.body = JSON.stringify(body);
        this.statusCode = statusCode;
        this.headers = headers || {};
    }

    static ok = (object: any, headers?: {[header: string]: boolean | number | string} | undefined) => {
        return new Response(object, 200, headers);
    }

    static created(object: any, headers?: {[header: string]: boolean | number | string} | undefined) {
        return new Response(object, 201, headers);
    }
}
