import { Coupon } from "@/core/entities/coupon.entity";
import {
    DEFAULT_LOYALTY_TARGET_POINTS,
    LoyaltyConfig,
    LoyaltyLedgerEntry,
    LoyaltyRewardClaim,
    LoyaltyStatus,
    LoyaltyTenantStats,
    ParsedLoyaltyConfig,
} from "@/core/entities/loyalty.entity";
import { CouponPresenter } from "@/core/presenters/coupon.presenter";
import { ICouponResponse } from "@/core/application/dtos/responses/coupon/coupon.response";

export interface ILoyaltyConfigResponse {
    targetPoints: number;
    rewardCouponId: string | null;
}

export interface ILoyaltySummaryResponse {
    points: number;
    targetPoints: number;
    remaining: number;
    status: LoyaltyStatus;
    coupon?: ICouponResponse;
}

export interface ILoyaltyClaimResponse {
    id: string;
    milestone: number;
    couponId: string;
    status: LoyaltyRewardClaim["status"];
    createdAt: Date;
    updatedAt: Date;
    coupon: ICouponResponse;
}

export interface ILoyaltyLedgerResponse {
    id: string;
    sourceAppointmentId: string;
    points: number;
    reason: string;
    createdAt: Date;
}

export interface ILoyaltyClaimListResponse {
    id: string;
    userId: string;
    milestone: number;
    couponId: string;
    status: LoyaltyRewardClaim["status"];
    createdAt: Date;
    coupon?: ICouponResponse;
}

export interface ILoyaltyTenantOverviewResponse {
    tenantId: string;
    name: string;
    slug: string;
    type: string;
    active: boolean;
    config: ILoyaltyConfigResponse;
    stats: LoyaltyTenantStats;
    recentLedger: ILoyaltyLedgerResponse[];
    recentClaims: ILoyaltyClaimListResponse[];
}

export class LoyaltyPresenter {
    static toConfigResponse(
        config: ParsedLoyaltyConfig | LoyaltyConfig,
    ): ILoyaltyConfigResponse {
        return {
            targetPoints:
                config.targetPoints ?? DEFAULT_LOYALTY_TARGET_POINTS,
            rewardCouponId: config.rewardCouponId ?? null,
        };
    }

    static toSummaryResponse(summary: {
        points: number;
        targetPoints: number;
        remaining: number;
        status: LoyaltyStatus;
        coupon?: Coupon;
    }): ILoyaltySummaryResponse {
        return {
            points: summary.points,
            targetPoints: summary.targetPoints,
            remaining: summary.remaining,
            status: summary.status,
            ...(summary.coupon
                ? { coupon: CouponPresenter.toResponse(summary.coupon) }
                : {}),
        };
    }

    static toClaimResponse(
        claim: LoyaltyRewardClaim,
        coupon: Coupon = claim.coupon!,
    ): ILoyaltyClaimResponse {
        return {
            id: claim.id,
            milestone: claim.milestone,
            couponId: claim.couponId,
            status: claim.status,
            createdAt: claim.createdAt,
            updatedAt: claim.updatedAt,
            coupon: CouponPresenter.toResponse(coupon),
        };
    }

    static toLedgerResponse(
        entry: LoyaltyLedgerEntry,
    ): ILoyaltyLedgerResponse {
        return {
            id: entry.id,
            sourceAppointmentId: entry.sourceAppointmentId,
            points: entry.points,
            reason: entry.reason,
            createdAt: entry.createdAt,
        };
    }

    static toClaimListResponse(
        claim: LoyaltyRewardClaim,
    ): ILoyaltyClaimListResponse {
        return {
            id: claim.id,
            userId: claim.userId,
            milestone: claim.milestone,
            couponId: claim.couponId,
            status: claim.status,
            createdAt: claim.createdAt,
            ...(claim.coupon
                ? { coupon: CouponPresenter.toResponse(claim.coupon) }
                : {}),
        };
    }

    static toTenantOverviewResponse(overview: {
        tenantId: string;
        name: string;
        slug: string;
        type: string;
        active: boolean;
        config: ParsedLoyaltyConfig;
        stats: LoyaltyTenantStats;
        recentLedger: LoyaltyLedgerEntry[];
        recentClaims: LoyaltyRewardClaim[];
    }): ILoyaltyTenantOverviewResponse {
        return {
            tenantId: overview.tenantId,
            name: overview.name,
            slug: overview.slug,
            type: overview.type,
            active: overview.active,
            config: LoyaltyPresenter.toConfigResponse(overview.config),
            stats: overview.stats,
            recentLedger: overview.recentLedger.map((entry) =>
                LoyaltyPresenter.toLedgerResponse(entry),
            ),
            recentClaims: overview.recentClaims.map((claim) =>
                LoyaltyPresenter.toClaimListResponse(claim),
            ),
        };
    }
}
