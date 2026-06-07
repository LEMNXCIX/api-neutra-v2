import { Feature } from "@/core/entities/feature.entity";

export interface IFeatureResponse {
    id: string;
    key: string;
    name: string;
    description?: string;
    category?: string;
    price: number;
    createdAt?: Date;
}

export class FeatureResponse {
    static fromEntity(feature: Feature): IFeatureResponse {
        return {
            id: feature.id,
            key: feature.key,
            name: feature.name,
            description: feature.description,
            category: feature.category,
            price: feature.price,
            createdAt: feature.createdAt,
        };
    }
}
