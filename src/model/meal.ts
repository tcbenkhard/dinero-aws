import {z} from "zod";

export const MealSchema = z.object({
    shortName: z.string(),
    name: z.string(),
    imageUrl: z.string().optional(),
    ingredients: z.string().optional(),
    description: z.string().optional(),
});

export type Meal = z.infer<typeof MealSchema>