import {z} from "zod";
import {MealSchema} from "./meal";

export const CreateMealRequestSchema = z.object({
    shortName: z.string(),
    name: z.string(),
    imageKey: z.string().optional(),
    ingredients: z.string().optional(),
    description: z.string().optional(),
});

export type CreateMealRequest = z.infer<typeof CreateMealRequestSchema>