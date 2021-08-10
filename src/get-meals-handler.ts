import {BaseHandler, Response} from "./util/handler";
import {GetMealsRequest} from "./model/get-meals-request";
import {APIGatewayProxyEvent, Context} from "aws-lambda";
import {MealsService} from "./service/meals-service";

class GetMealsHandler extends BaseHandler<GetMealsRequest> {
    private mealService = new MealsService();

    async handle(request: GetMealsRequest, context: Context): Promise<Response> {
        const result = await this.mealService.findAll();
        return Response.ok(result);
    }

    validate(event: APIGatewayProxyEvent): GetMealsRequest {
        return {};
    }
}

export const handler = new GetMealsHandler().lambda;