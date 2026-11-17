import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
    ActiveOnlyQueryDto,
    LogListQueryDto,
    OrderListQueryDto,
    PagedQueryDto,
} from "@/core/application/dtos/requests/list-query.dto";

async function errorsOf<T>(
    ctor: new () => T,
    input: object,
): Promise<string[]> {
    const dto = plainToInstance(ctor, input);
    return (await validate(dto as object)).map((error) => error.property);
}

describe("shared list query DTOs", () => {
    test("PagedQueryDto rejects garbage and accepts positive integers", async () => {
        expect(await errorsOf(PagedQueryDto, { page: "abc" })).toEqual([
            "page",
        ]);
        expect(await errorsOf(PagedQueryDto, { limit: "0" })).toEqual([
            "limit",
        ]);
        expect(
            await errorsOf(PagedQueryDto, { page: "2", limit: "25" }),
        ).toEqual([]);
    });

    test("ActiveOnlyQueryDto only accepts literal booleans", async () => {
        expect(await errorsOf(ActiveOnlyQueryDto, { activeOnly: "1" })).toEqual(
            ["activeOnly"],
        );
        expect(
            await errorsOf(ActiveOnlyQueryDto, { activeOnly: "false" }),
        ).toEqual([]);
    });

    test("OrderListQueryDto rejects malformed dates", async () => {
        expect(
            await errorsOf(OrderListQueryDto, { startDate: "not-a-date" }),
        ).toEqual(["startDate"]);
    });

    test("LogListQueryDto validates skip/take and dates", async () => {
        expect(await errorsOf(LogListQueryDto, { skip: "-1" })).toEqual([
            "skip",
        ]);
        expect(await errorsOf(LogListQueryDto, { endDate: "garbage" })).toEqual(
            ["endDate"],
        );
    });
});
