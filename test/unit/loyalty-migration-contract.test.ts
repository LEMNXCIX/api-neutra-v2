import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
    join(
        process.cwd(),
        "prisma/migrations/20260829000000_finalize_loyalty_campaigns/migration.sql",
    ),
    "utf8",
);

describe("loyalty campaign contract migration", () => {
    test("checks every required campaign field before enforcing it", () => {
        const check = migration.indexOf(
            "Loyalty ledger campaign backfill is incomplete",
        );
        const notNull = migration.indexOf(
            'ALTER COLUMN "campaignId" SET NOT NULL',
        );

        expect(check).toBeGreaterThanOrEqual(0);
        expect(check).toBeLessThan(notNull);
        for (const column of [
            "campaignId",
            "sourceType",
            "sourceId",
            "value",
        ]) {
            expect(migration).toContain(`"${column}" IS NULL`);
        }
        expect(migration).toContain(
            'ALTER TABLE "loyalty_reward_claims"\nALTER COLUMN "campaignId" SET NOT NULL',
        );
    });

    test("removes legacy storage and enforces the ledger value sign", () => {
        expect(migration).toContain(
            'CHECK (\n    ("entryType" = \'ACCRUAL\' AND "value" >= 0)\n    OR ("entryType" = \'REVERSAL\' AND "value" < 0)\n)',
        );
        expect(migration).toContain('DROP COLUMN "sourceAppointmentId"');
        expect(migration).toContain('DROP COLUMN "points"');
        expect(migration).toContain('DROP COLUMN "milestone"');
        expect(migration).toContain('SET "config" = "config" - \'loyalty\'');
    });
});
