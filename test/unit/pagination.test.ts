import { parsePagination } from "@/core/utils/pagination";

describe("parsePagination", () => {
    test("uses defaults when pagination is absent", () => {
        expect(parsePagination({})).toEqual({ page: 1, limit: 10 });
    });

    test("coerces positive numeric strings", () => {
        expect(parsePagination({ page: "3", limit: "25" })).toEqual({
            page: 3,
            limit: 25,
        });
    });

    test("accepts numbers", () => {
        expect(parsePagination({ page: 2, limit: 50 })).toEqual({
            page: 2,
            limit: 50,
        });
    });

    test("falls back on zero, negatives, non-integers and garbage", () => {
        expect(parsePagination({ page: "0", limit: "-5" })).toEqual({
            page: 1,
            limit: 10,
        });
        expect(parsePagination({ page: "1.5", limit: "abc" })).toEqual({
            page: 1,
            limit: 10,
        });
    });

    test("clamps the limit to 100", () => {
        expect(parsePagination({ page: "2", limit: "500" })).toEqual({
            page: 2,
            limit: 100,
        });
    });

    test("uses the first value of an array query param", () => {
        expect(parsePagination({ page: ["4", "9"], limit: ["20"] })).toEqual({
            page: 4,
            limit: 20,
        });
    });

    test("accepts a per-endpoint default limit", () => {
        expect(parsePagination({}, { defaultLimit: 50 })).toEqual({
            page: 1,
            limit: 50,
        });
        expect(parsePagination({ limit: "500" }, { defaultLimit: 50 })).toEqual(
            { page: 1, limit: 100 },
        );
    });
});
