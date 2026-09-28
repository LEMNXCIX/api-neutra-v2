import type { Request, Response } from "express";
import type {
    CreateLoyaltyCampaignDTO,
    UpdateLoyaltyCampaignDTO,
} from "@/core/application/dtos/requests/loyalty.request";
import { LoyaltyPresenter } from "@/core/application/dtos/responses/loyalty/loyalty.response";
import type { ClaimLoyaltyRewardUseCase } from "@/core/application/loyalty/claim-loyalty-reward.use-case";
import type { CreateLoyaltyCampaignUseCase } from "@/core/application/loyalty/create-loyalty-campaign.use-case";
import type { GetAllTenantsLoyaltyOverviewUseCase } from "@/core/application/loyalty/get-all-tenants-loyalty-overview.use-case";
import type { GetCustomerLoyaltySummaryUseCase } from "@/core/application/loyalty/get-customer-loyalty-summary.use-case";
import type { GetLoyaltyCampaignsUseCase } from "@/core/application/loyalty/get-loyalty-campaigns.use-case";
import type { GetTenantLoyaltyOverviewUseCase } from "@/core/application/loyalty/get-tenant-loyalty-overview.use-case";
import type { TransitionLoyaltyCampaignUseCase } from "@/core/application/loyalty/transition-loyalty-campaign.use-case";
import type { UpdateLoyaltyCampaignUseCase } from "@/core/application/loyalty/update-loyalty-campaign.use-case";
import {
    EntityNotFoundError,
    ForbiddenError,
    UnauthorizedError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { isSuperAdmin } from "@/core/domain/rbac/access-policy";
import { present } from "@/core/utils/use-case-result";
import {
    AuthErrorCodes,
    TenantErrorCodes,
    ValidationErrorCodes,
} from "@/types/error-codes";
import type { AuthenticatedUser } from "@/types/rbac";

function requireUserId(req: Request): string {
    const userId = req.user?.id;
    if (!userId) {
        throw new UnauthorizedError();
    }
    return userId;
}

function requireTenantId(req: Request): string {
    const tenantId =
        typeof req.tenantId === "string" ? req.tenantId.trim() : "";
    if (!tenantId || tenantId.toLowerCase() === "all") {
        throw new ValidationError(
            "A concrete tenant context is required",
            TenantErrorCodes.TENANT_REQUIRED,
        );
    }
    return tenantId;
}

function requireCampaignId(req: Request): string {
    const campaignId =
        typeof req.params?.campaignId === "string"
            ? req.params.campaignId.trim()
            : "";
    if (!campaignId) {
        throw new ValidationError(
            "Campaign ID is required",
            ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
        );
    }
    return campaignId;
}

function requireSuperAdmin(user: AuthenticatedUser | undefined): void {
    if (!user?.role) {
        throw new UnauthorizedError();
    }
    if (!isSuperAdmin(user)) {
        throw new ForbiddenError(
            "Super administrator access is required",
            AuthErrorCodes.FORBIDDEN,
        );
    }
}

export class LoyaltyController {
    constructor(
        private getCustomerLoyaltySummaryUseCase: GetCustomerLoyaltySummaryUseCase,
        private claimLoyaltyRewardUseCase: ClaimLoyaltyRewardUseCase,
        private getLoyaltyCampaignsUseCase: GetLoyaltyCampaignsUseCase,
        private createLoyaltyCampaignUseCase: CreateLoyaltyCampaignUseCase,
        private updateLoyaltyCampaignUseCase: UpdateLoyaltyCampaignUseCase,
        private transitionLoyaltyCampaignUseCase: TransitionLoyaltyCampaignUseCase,
        private getTenantLoyaltyOverviewUseCase: GetTenantLoyaltyOverviewUseCase,
        private getAllTenantsLoyaltyOverviewUseCase: GetAllTenantsLoyaltyOverviewUseCase,
    ) {}

    getCustomerCampaigns = async (req: Request, res: Response) => {
        const result = await this.getCustomerLoyaltySummaryUseCase.executeList(
            requireTenantId(req),
            requireUserId(req),
        );
        return res.json(
            present(
                result,
                LoyaltyPresenter.toCustomerCampaignSummaryListResponse,
            ),
        );
    };

    getCustomerCampaign = async (req: Request, res: Response) => {
        const result = await this.getCustomerLoyaltySummaryUseCase.execute(
            requireTenantId(req),
            requireCampaignId(req),
            requireUserId(req),
        );
        return res.json(
            present(result, LoyaltyPresenter.toCustomerCampaignSummaryResponse),
        );
    };

    claimCustomerCampaign = async (req: Request, res: Response) => {
        const result = await this.claimLoyaltyRewardUseCase.execute(
            requireTenantId(req),
            requireCampaignId(req),
            requireUserId(req),
        );
        return res.json(
            present(result, (data) =>
                LoyaltyPresenter.toCampaignClaimResponse(
                    data.claim,
                    data.coupon,
                ),
            ),
        );
    };

    getCampaigns = async (req: Request, res: Response) => {
        const result = await this.getLoyaltyCampaignsUseCase.execute(
            requireTenantId(req),
        );
        return res.json(
            present(result, LoyaltyPresenter.toCampaignListResponse),
        );
    };

    getCampaign = async (req: Request, res: Response) => {
        const tenantId = requireTenantId(req);
        const campaignId = requireCampaignId(req);
        const result = await this.getLoyaltyCampaignsUseCase.execute(tenantId);
        const campaign = result.data?.find((item) => item.id === campaignId);
        if (!campaign) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
        }
        return res.json(
            present(
                { ...result, data: campaign },
                LoyaltyPresenter.toCampaignResponse,
            ),
        );
    };

    createCampaign = async (req: Request, res: Response) => {
        const result = await this.createLoyaltyCampaignUseCase.execute(
            requireTenantId(req),
            // No `?? req.body` fallback: both campaign writes sit behind
            // `validateDto`, so a missing `validatedBody` means the middleware
            // was bypassed, and silently falling back to the raw body is
            // exactly how an unvalidated write gets through.
            req.validatedBody as CreateLoyaltyCampaignDTO,
        );
        return res
            .status(201)
            .json(present(result, LoyaltyPresenter.toCampaignResponse));
    };

    updateCampaign = async (req: Request, res: Response) => {
        const result = await this.updateLoyaltyCampaignUseCase.execute(
            requireTenantId(req),
            requireCampaignId(req),
            req.validatedBody as UpdateLoyaltyCampaignDTO,
        );
        return res.json(present(result, LoyaltyPresenter.toCampaignResponse));
    };

    deleteCampaign = async (req: Request, res: Response) => {
        const result = await this.transitionLoyaltyCampaignUseCase.deleteDraft(
            requireTenantId(req),
            requireCampaignId(req),
        );
        return res.json(result);
    };

    activateCampaign = async (req: Request, res: Response) => {
        return this.transitionCampaign(req, res, "activate");
    };

    endCampaign = async (req: Request, res: Response) => {
        return this.transitionCampaign(req, res, "end");
    };

    archiveCampaign = async (req: Request, res: Response) => {
        return this.transitionCampaign(req, res, "archive");
    };

    getTenantSummary = async (req: Request, res: Response) => {
        const result = await this.getTenantLoyaltyOverviewUseCase.execute(
            requireTenantId(req),
        );
        return res.json(
            present(result, LoyaltyPresenter.toTenantCampaignOverviewResponse),
        );
    };

    getAllTenants = async (req: Request, res: Response) => {
        requireSuperAdmin(req.user);
        const result = await this.getAllTenantsLoyaltyOverviewUseCase.execute();
        return res.json(
            present(result, (overviews) =>
                overviews.map((overview) =>
                    LoyaltyPresenter.toTenantCampaignOverviewResponse(overview),
                ),
            ),
        );
    };

    private transitionCampaign(
        req: Request,
        res: Response,
        action: "activate" | "end" | "archive",
    ) {
        return this.transitionLoyaltyCampaignUseCase
            .execute(requireTenantId(req), requireCampaignId(req), action)
            .then((result) =>
                res.json(
                    present(result, (campaign) =>
                        LoyaltyPresenter.toCampaignResponse(campaign!),
                    ),
                ),
            );
    }
}
