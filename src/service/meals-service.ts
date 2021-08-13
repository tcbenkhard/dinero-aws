import {Meal} from "../model/meal";
import * as AWS from 'aws-sdk'
import {BadRequestError} from "../util/error";
import {CreateMealRequest} from "../model/create-meal-request";

export class MealsService {
    private dynamo = new AWS.DynamoDB.DocumentClient({region: 'eu-west-1'})
    private readonly MEALS_TABLE = process.env.MEALS_TABLE_NAME!;

    public findAll = async (): Promise<Meal[]> => {
        const result = await this.dynamo.scan({
            TableName: this.MEALS_TABLE,
        }).promise();

        return result.Items as Meal[];
    }

    public create = async (createMealRequest: CreateMealRequest): Promise<Meal> => {
        delete createMealRequest.imageKey;
        try {
            await this.dynamo.put({
                TableName: this.MEALS_TABLE,
                Item: createMealRequest,
                ConditionExpression: 'attribute_not_exists(shortName)'
            }).promise();
        } catch (e) {
            if(e.code === 'ConditionalCheckFailedException') {
                throw new BadRequestError('ShortName already in use');
            }
            throw e;
        }

        return createMealRequest;
    }

    public  save = async (meal: Meal): Promise<Meal> => {
        await this.dynamo.put({
            TableName: this.MEALS_TABLE,
            Item: meal,
        }).promise();

        return meal;
    }

    public findByShortName = async (reference: string): Promise<Meal> => {
        const data = await this.dynamo.query({
            TableName: this.MEALS_TABLE,
            KeyConditionExpression: `shortName = :reference`,
            ExpressionAttributeValues: {
                ':reference': reference
            }
        }).promise()

        return data.Items?.[0] as Meal;
    }
}
