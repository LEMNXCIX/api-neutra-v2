import { IsOptional, IsString, Matches } from "class-validator";
import type { NextFunction, Request, Response } from "express";
import { ListAppointmentsQueryDto } from "@/core/application/dtos/requests/appointment.query";
import { validateQueryDto } from "@/middleware/validation.middleware";

class ListQuery {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Matches(/^[1-9]\d*$/)
    page?: string;

    @IsOptional()
    @Matches(/^[1-9]\d*$/)
    limit?: string;
}

describe("validateQueryDto", () => {
    function harness(query: Record<string, unknown>) {
        const req = { query } as unknown as Request;
        const res = {
            apiError: jest.fn().mockReturnThis(),
        } as unknown as Response;
        const next = jest.fn() as NextFunction;
        return { req, res, next };
    }

    test("exposes the validated query on req.validatedQuery", async () => {
        const { req, res, next } = harness({
            search: "coffee",
            page: "2",
            limit: "25",
        });

        await validateQueryDto(ListQuery)(req, res, next);

        expect(req.validatedQuery).toMatchObject({
            search: "coffee",
            page: "2",
            limit: "25",
        });
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.apiError).not.toHaveBeenCalled();
    });

    // Documents the deliberate contract hardening on GET /api/appointments:
    // malformed pagination used to fall back silently, now it is a 400.
    test("the real list query DTO rejects malformed pagination", async () => {
        const { req, res, next } = harness({ page: "abc" });

        await validateQueryDto(ListAppointmentsQueryDto)(req, res, next);

        expect(res.apiError).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ field: "page" }),
            ]),
            "Validación fallida",
            400,
        );
        expect(next).not.toHaveBeenCalled();
    });

    test("rejects garbage with a 400 without calling next", async () => {
        const { req, res, next } = harness({ limit: "abc" });

        await validateQueryDto(ListQuery)(req, res, next);

        expect(res.apiError).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    code: "VALIDATION_INVALID_FORMAT",
                    field: "limit",
                }),
            ]),
            "Validación fallida",
            400,
        );
        expect(next).not.toHaveBeenCalled();
    });
});
