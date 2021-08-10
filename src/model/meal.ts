import {Ingredient} from "./ingredient";

export class Meal {
    shortName: string;
    name: string;
    imageKey?: string;
    description?: string;
    ingredients?: Ingredient[];
}