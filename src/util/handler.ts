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

    private constructor(body: string, statusCode: number) {
        this.body = JSON.stringify(body);
        this.statusCode = statusCode;
    }

    static ok = (object: any) => {
        return new Response(object, 200);
    }

    static created(object: any) {
        return new Response(object, 201);
    }
}
