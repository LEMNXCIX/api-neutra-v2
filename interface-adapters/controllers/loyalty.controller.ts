import { Request, Response } from "express";
import { GetCustomerLoyaltySummaryUseCase } from "@/core/application/loyalty/get-customer-loyalty-summary.use-case";
import { ClaimLoyaltyRewardUseCase } from "@/core/application/loyalty/claim-loyalty-reward.use-case";
import { GetTenantLoyaltyOverviewUseCase } from "@/core/application/loyalty/get-tenant-loyalty-overview.use-case";
import { GetLoyaltyConfigUseCase } from "@/core/application/loyalty/get-loyalty-config.use-case";
import { UpdateLoyaltyConfigUseCase } from "@/core/application/loyalty/update-loyalty-config.use-case";
import { GetAllTenantsLoyaltyOverviewUseCase } from "@/core/application/loyalty/get-all-tenants-loyalty-overview.use-case";
import { LoyaltyPresenter } from "@/core/application/dtos/responses/loyalty/loyalty.response";
import { UpdateLoyaltyConfigDTO } from "@/core/application/dtos/requests/loyalty.request";
import { present } from "@/core/utils/use-case-result";
import {
    ForbiddenError,
    UnauthorizedError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { ROLE_CONSTANTS } from "@/core/domain/constants";
import { AuthenticatedUser } from "@/types/rbac";

type LoyaltyOverviewInput = Parameters<
    typeof LoyaltyPresenter.toTenantOverviewResponse
>[0];

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
            "TENANT_REQUIRED",
        );
    }
    return tenantId;
}

function requireExplicitTenantId(req: Request): string {
    const rawTenantId = req.params?.tenantId;
    const tenantId =
        typeof rawTenantId === "string" ? rawTenantId.trim() : "";
    if (!tenantId || tenantId.toLowerCase() === "all") {
        throw new ValidationError(
            "A concrete tenant path is required",
            "TENANT_REQUIRED",
        );
    }
    return tenantId;
}

function requireSuperAdmin(user: AuthenticatedUser | undefined): void {
    if (!user?.role) {
        throw new UnauthorizedError();
    }
    if (user.role.name !== ROLE_CONSTANTS.SUPER_ADMIN) {
        throw new ForbiddenError(
            "Super administrator access is required",
            "FORBIDDEN",
        );
    }
}

export class LoyaltyController {
    constructor(
        private getCustomerLoyaltySummaryUseCase: GetCustomerLoyaltySummaryUseCase,
        private claimLoyaltyRewardUseCase: ClaimLoyaltyRewardUseCase,
        private getTenantLoyaltyOverviewUseCase: GetTenantLoyaltyOverviewUseCase,
        private getLoyaltyConfigUseCase: GetLoyaltyConfigUseCase,
        private updateLoyaltyConfigUseCase: UpdateLoyaltyConfigUseCase,
        private getAllTenantsLoyaltyOverviewUseCase: GetAllTenantsLoyaltyOverviewUseCase,
    ) {}

    getCustomerSummary = async (req: Request, res: Response) => {
        const result = await this.getCustomerLoyaltySummaryUseCase.execute(
            requireTenantId(req),
            requireUserId(req),
        );
        return res.json(
            present(result, LoyaltyPresenter.toSummaryResponse),
        );
    };

    claimReward = async (req: Request, res: Response) => {
        const result = await this.claimLoyaltyRewardUseCase.execute(
            requireTenantId(req),
            requireUserId(req),
        );
        return res.json(
            present(result, (data) =>
                LoyaltyPresenter.toClaimResponse(data.claim, data.coupon),
            ),
        );
    };

    getTenantSummary = async (req: Request, res: Response) => {
        const result = await this.getTenantLoyaltyOverviewUseCase.execute(
            requireTenantId(req),
        );
        return res.json(
            present(result, LoyaltyPresenter.toTenantOverviewResponse),
        );
    };

    getConfig = async (req: Request, res: Response) => {
        const result = await this.getLoyaltyConfigUseCase.execute(
            requireTenantId(req),
        );
        return res.json(
            present(result, LoyaltyPresenter.toConfigResponse),
        );
    };

    updateConfig = async (req: Request, res: Response) => {
        const result = await this.updateLoyaltyConfigUseCase.execute(
            requireTenantId(req),
            (req.validatedBody ?? req.body) as UpdateLoyaltyConfigDTO,
        );
        return res.json(
            present(result, LoyaltyPresenter.toConfigResponse),
        );
    };

    getAllTenants = async (req: Request, res: Response) => {
        requireSuperAdmin(req.user);
        const result = await this.getAllTenantsLoyaltyOverviewUseCase.execute();
        return res.json(
            present(result, (overviews: LoyaltyOverviewInput[]) =>
                overviews.map((overview) =>
                    LoyaltyPresenter.toTenantOverviewResponse(overview),
                ),
            ),
        );
    };

    getTenantConfig = async (req: Request, res: Response) => {
        requireSuperAdmin(req.user);
        const result = await this.getLoyaltyConfigUseCase.execute(
            requireExplicitTenantId(req),
        );
        return res.json(
            present(result, LoyaltyPresenter.toConfigResponse),
        );
    };

    updateTenantConfig = async (req: Request, res: Response) => {
        requireSuperAdmin(req.user);
        const result = await this.updateLoyaltyConfigUseCase.execute(
            requireExplicitTenantId(req),
            (req.validatedBody ?? req.body) as UpdateLoyaltyConfigDTO,
        );
        return res.json(
            present(result, LoyaltyPresenter.toConfigResponse),
        );
    };
}
