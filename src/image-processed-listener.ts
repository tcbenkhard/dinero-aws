import {SQSEvent} from "aws-lambda";
import {ImageProcessedEvent, toImageProcessedEvent} from "./events/image-processed-event";
import {MealsService} from "./service/meals-service";

class ImageProcessedListener {
    private mealService = new MealsService();

    public handle = async (event: SQSEvent) => {
        console.log('Received event: ', event);
        const promises = event.Records
            .map(toImageProcessedEvent)
            .map(this.processRecord);

        await Promise.all(promises);
    }

    private processRecord = async (event: ImageProcessedEvent) => {
        console.log('Processing ImageProcessedEvent: ', event);
        const meal = await this.mealService.findByShortName(event.reference);
        meal.imageUrl = event.imageUrl;
        await this.mealService.save(meal);
    }
}

export const handler = new ImageProcessedListener().handle;