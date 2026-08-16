import { Feature } from "@/core/entities/feature.entity";
import {
    FeatureResponse,
    IFeatureResponse,
} from "@/core/application/dtos/responses/feature/feature.response";

export class FeaturePresenter {
    static toResponse(feature: Feature): IFeatureResponse {
        return FeatureResponse.fromEntity(feature);
    }

    static toResponseList(features: Feature[]): IFeatureResponse[] {
        if (!Array.isArray(features)) return [];
        return features.map((f) => FeatureResponse.fromEntity(f));
    }
}
