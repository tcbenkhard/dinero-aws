import * as AWSMock from 'aws-sdk-mock';
import * as AWS from 'aws-sdk';
import {MealsService} from "../../src/service/meals-service";

describe('Meal service', () => {
    beforeEach(() => {
        AWSMock.restore();
        AWSMock.setSDKInstance(AWS);
    })

    it('Should return empty array if dynamo returns empty array', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
            callback(null, {Items: []});
        })

        const service = new MealsService();
        await expect(service.findAll()).resolves.toStrictEqual([]);
    })

    it('Should return the result of the scan', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
            callback(null, {Items: [{name: 'meal1'}, {name: 'meal2'}]});
        })

        const service = new MealsService();
        await expect(service.findAll()).resolves.toStrictEqual([{name: 'meal1'}, {name: 'meal2'}]);
    })

    it('Should throw the error of dynamo', async () => {
        AWSMock.mock('DynamoDB.DocumentClient', 'scan', (params, callback) => {
            callback('Something went wrong', null);
        })

        const service = new MealsService();
        await expect(service.findAll()).rejects.toStrictEqual('Something went wrong');
    })
});
