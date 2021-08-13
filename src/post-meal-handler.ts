import {BaseHandler, Response} from "./util/handler";
import {Meal, MealSchema} from "./model/meal";
import {APIGatewayProxyEvent} from "aws-lambda";
import {BadRequestError} from "./util/error";
import {MealsService} from "./service/meals-service";
import {ImageService} from "./service/image-service";
import {CreateMealRequest, CreateMealRequestSchema} from "./model/create-meal-request";

class PostMealHandler extends BaseHandler<CreateMealRequest> {
    private mealService = new MealsService();
    private imageService = new ImageService();

    async handle(request: CreateMealRequest): Promise<Response> {
        const imageKey = request.imageKey;
        const meal = await this.mealService.create(request);
        if(imageKey) {
            console.log(`Requesting image processing for key ${imageKey}`);
            await this.imageService.processImage({reference: request.shortName, imageKey});
        }

        return Response.created(meal);
    }

    validate(event: APIGatewayProxyEvent): CreateMealRequest {
        if(!event.body) throw new BadRequestError('Missing event body');
        const jsonBody = (JSON.parse(event.body));
        try {
            const mealRequest: CreateMealRequest = CreateMealRequestSchema.parse(jsonBody);
            return mealRequest;
        } catch (e) {
            console.error('Invalid request body', e);
            throw new BadRequestError('Invalid request body')
        }
    }
}

export const handler = new PostMealHandler().lambda