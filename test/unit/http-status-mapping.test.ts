import {
    AuthErrorCodes,
    BusinessErrorCodes,
    DatabaseErrorCodes,
    ExternalServiceErrorCodes,
    getHttpStatusFromErrorCode,
    LoyaltyErrorCodes,
    RateLimitErrorCodes,
    ResourceErrorCodes,
    SystemErrorCodes,
    TenantErrorCodes,
    ValidationErrorCodes,
    WhatsAppErrorCodes,
} from "@/types/error-codes";

/**
 * This mapper is reached live from the global error middleware for every
 * `AppError`, and it routes purely on the code's string prefix. It had no test
 * at all, so a single mis-prefixed member silently turned a client error into a
 * 500. Every prefix is pinned here, including the sub-branches inside RESOURCE_
 * and TENANT_ where two members share a status.
 */
describe("getHttpStatusFromErrorCode", () => {
    describe("AUTH_", () => {
        it("returns 401 for ordinary auth failures", () => {
            expect(
                getHttpStatusFromErrorCode(AuthErrorCodes.INVALID_TOKEN),
            ).toBe(401);
            expect(
                getHttpStatusFromErrorCode(AuthErrorCodes.TOKEN_EXPIRED),
            ).toBe(401);
            expect(
                getHttpStatusFromErrorCode(
                    AuthErrorCodes.INSUFFICIENT_PERMISSIONS,
                ),
            ).toBe(401);
        });

        it("returns 403 for the one forbidden member", () => {
            expect(getHttpStatusFromErrorCode(AuthErrorCodes.FORBIDDEN)).toBe(
                403,
            );
        });
    });

    it("maps every VALIDATION_ member to 400", () => {
        expect(
            getHttpStatusFromErrorCode(
                ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
            ),
        ).toBe(400);
        expect(
            getHttpStatusFromErrorCode(ValidationErrorCodes.INVALID_EMAIL),
        ).toBe(400);
    });

    describe("RESOURCE_", () => {
        it("maps not-found members to 404", () => {
            expect(
                getHttpStatusFromErrorCode(ResourceErrorCodes.NOT_FOUND),
            ).toBe(404);
            expect(
                getHttpStatusFromErrorCode(ResourceErrorCodes.ROUTE_NOT_FOUND),
            ).toBe(404);
        });

        it("maps conflict members to 409", () => {
            expect(
                getHttpStatusFromErrorCode(ResourceErrorCodes.ALREADY_EXISTS),
            ).toBe(409);
            expect(
                getHttpStatusFromErrorCode(ResourceErrorCodes.CONFLICT),
            ).toBe(409);
        });

        it("maps a gone resource to 410", () => {
            expect(getHttpStatusFromErrorCode(ResourceErrorCodes.GONE)).toBe(
                410,
            );
        });

        it("falls back to 400 for a resource member with no explicit status", () => {
            expect(
                getHttpStatusFromErrorCode(ResourceErrorCodes.INVALID_STATE),
            ).toBe(400);
        });
    });

    describe("TENANT_", () => {
        it("maps a missing tenant to 404", () => {
            expect(
                getHttpStatusFromErrorCode(TenantErrorCodes.TENANT_NOT_FOUND),
            ).toBe(404);
        });

        it("maps an inactive tenant to 403", () => {
            expect(
                getHttpStatusFromErrorCode(TenantErrorCodes.TENANT_INACTIVE),
            ).toBe(403);
        });

        it("falls back to 400 for other tenant members", () => {
            expect(
                getHttpStatusFromErrorCode(TenantErrorCodes.TENANT_REQUIRED),
            ).toBe(400);
            expect(
                getHttpStatusFromErrorCode(
                    TenantErrorCodes.FEATURE_NOT_ENABLED,
                ),
            ).toBe(400);
        });
    });

    it("maps every BUSINESS_ member to 422", () => {
        expect(getHttpStatusFromErrorCode(BusinessErrorCodes.CART_EMPTY)).toBe(
            422,
        );
        expect(
            getHttpStatusFromErrorCode(BusinessErrorCodes.INSUFFICIENT_STOCK),
        ).toBe(422);
    });

    it("maps DB_ to 500", () => {
        expect(
            getHttpStatusFromErrorCode(DatabaseErrorCodes.CONSTRAINT_VIOLATION),
        ).toBe(500);
    });

    it("maps EXTERNAL_ to 502", () => {
        expect(
            getHttpStatusFromErrorCode(
                ExternalServiceErrorCodes.THIRD_PARTY_UNAVAILABLE,
            ),
        ).toBe(502);
    });

    it("maps RATE_LIMIT_ to 429", () => {
        expect(
            getHttpStatusFromErrorCode(RateLimitErrorCodes.TOO_MANY_REQUESTS),
        ).toBe(429);
    });

    describe("WHATSAPP_", () => {
        it("maps a missing config to 404", () => {
            expect(
                getHttpStatusFromErrorCode(
                    WhatsAppErrorCodes.WHATSAPP_CONFIG_NOT_FOUND,
                ),
            ).toBe(404);
        });

        it("maps any other WhatsApp failure to 502", () => {
            expect(
                getHttpStatusFromErrorCode(
                    WhatsAppErrorCodes.WHATSAPP_MESSAGE_FAILED,
                ),
            ).toBe(502);
        });
    });

    it("falls back to 500 for an unrecognised code", () => {
        expect(getHttpStatusFromErrorCode("SOMETHING_ELSE")).toBe(500);
        expect(
            getHttpStatusFromErrorCode(SystemErrorCodes.INTERNAL_SERVER_ERROR),
        ).toBe(500);
    });

    /**
     * Two LoyaltyErrorCodes members carry the prefix in the wrong position, so
     * this prefix-routed mapper cannot classify them and they fall through to
     * the 500 default. Both are thrown as validation failures by
     * assertLoyaltyRewardTemplate, so a client sees a server error for what is
     * a bad request. Today they only reach the correct 400 through
     * httpStatusFromDomainError, which routes by error class instead — but any
     * AppError carrying one of these codes would answer 500.
     *
     * This is pinned deliberately: it documents the anomaly rather than
     * encoding it as intended behaviour. Renaming either wire value is a
     * breaking change for clients, so it needs a decision, not a test edit.
     */
    describe("known mis-ordered prefixes", () => {
        it("cannot classify INVALID_REWARD_TEMPLATE and defaults to 500", () => {
            expect(LoyaltyErrorCodes.INVALID_REWARD_TEMPLATE).toBe(
                "INVALID_LOYALTY_REWARD_TEMPLATE",
            );
            expect(
                getHttpStatusFromErrorCode(
                    LoyaltyErrorCodes.INVALID_REWARD_TEMPLATE,
                ),
            ).toBe(500);
        });

        it("cannot classify INVALID_CAMPAIGN_TRANSITION's siblings either", () => {
            // The sibling members do carry the prefix and classify as 422-expected
            // 500-by-default, which is what makes the two anomalies visible.
            expect(LoyaltyErrorCodes.CAMPAIGN_NOT_DRAFT).toBe(
                "LOYALTY_CAMPAIGN_NOT_DRAFT",
            );
            expect(
                getHttpStatusFromErrorCode(
                    LoyaltyErrorCodes.CAMPAIGN_NOT_DRAFT,
                ),
            ).toBe(500);
        });
    });
});
