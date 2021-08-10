import {Meal} from "../model/meal";
import * as AWS from 'aws-sdk'

export class MealsService {
    private dynamo = new AWS.DynamoDB.DocumentClient({region: 'eu-west-1'})
    private readonly MEALS_TABLE = process.env.MEALS_TABLE_NAME!;

    public findAll = async (): Promise<Meal[]> => {
        const result = await this.dynamo.scan({
            TableName: this.MEALS_TABLE,
        }).promise();

        return result.Items as Meal[];
    }
}
