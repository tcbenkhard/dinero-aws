import {handler} from "../src/get-meals-handler";
import {APIGatewayProxyEvent, Context} from "aws-lambda";
import {MealsService} from "../src/service/meals-service";
import {Response} from "../src/util/handler";

jest.mock('../src/service/meals-service')

describe('Get meals handler', () => {

    beforeAll(() => {
        jest.clearAllMocks();
    })

    it('Should return OK without results', async () => {
        MealsService.prototype.findAll = jest.fn().mockImplementationOnce(() => {
            return []
        })
        // @ts-ignore
        const event: APIGatewayProxyEvent = {};
        // @ts-ignore
        const context: Context = {}
        const expectedResult = Response.ok([]);
        const result = handler(event, context);

        await expect(result).resolves.toStrictEqual(expectedResult);
    })

    it('Should return OK with results', async () => {
        MealsService.prototype.findAll = jest.fn().mockImplementationOnce(() => {
            return [{name: 'meal 1'}, {name: 'meal 2'}];
        })
        // @ts-ignore
        const event: APIGatewayProxyEvent = {};
        // @ts-ignore
        const context: Context = {}
        const expectedResult = Response.ok([{name: 'meal 1'}, {name: 'meal 2'}]);
        const result = handler(event, context);

        await expect(result).resolves.toStrictEqual(expectedResult);
    })
})