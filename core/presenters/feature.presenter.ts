import {
    FeatureResponse,
    IFeatureResponse,
} from "@/core/application/dtos/responses/feature/feature.response";

export class FeaturePresenter {
    static toResponse(feature: any): IFeatureResponse {
        return FeatureResponse.fromEntity(feature);
    }

    static toResponseList(features: any[]): IFeatureResponse[] {
        return features.map((f) => FeatureResponse.fromEntity(f));
    }
}
