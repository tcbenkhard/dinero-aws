import {APIGatewayProxyResult} from "aws-lambda";

export abstract class ApiError implements APIGatewayProxyResult {
    body: string;
    statusCode: number;

    constructor(body: string, statusCode: number) {
        this.body = JSON.stringify({
            statusCode,
            body,
        });
        this.statusCode = statusCode;
    }
}

export class BadRequestError extends ApiError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class InternalServerError extends ApiError {
    constructor() {
        super('Internal server error', 500);
    }
}