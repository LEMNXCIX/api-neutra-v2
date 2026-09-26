import fs from "node:fs";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { rewriteProductionAliases } from "../../scripts/verify-production-build";

// This test compiles into dist, and the production alias rewriter scans every
// emitted file. A literal aliased specifier on a code line here would be
// rewritten — or rejected as escaping dist — when `npm run build` runs, which
// is how the bug this suite pins first reached a build at all. So the
// specifiers are assembled from a constant instead. The strings the assertions
// see at runtime are byte-for-byte what a hand-written literal would produce.
const AT = "@" + "/";
const OUTSIDE_SPECIFIER = AT + "../outside";
const INSIDE_SPECIFIER = AT + "core/thing";

/**
 * The rewriter used to match any quoted aliased specifier anywhere in a file,
 * including inside comments, so a comment that spelled one out failed the
 * production build with `Alias escapes dist` while tsc stayed clean. These
 * cases pin that comments are left alone and real imports are still rewritten.
 */
describe("production alias rewrite", () => {
    let root: string;

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), "alias-rewrite-"));
        mkdirSync(join(root, "core"), { recursive: true });
        writeFileSync(join(root, "core", "thing.js"), "module.exports = {};\n", "utf8");
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    it("rewrites a real aliased import on a code line", () => {
        const file = join(root, "app.js");
        writeFileSync(
            file,
            [
                `const { thing } = require("${INSIDE_SPECIFIER}");`,
                "module.exports = thing;",
            ].join("\n"),
            "utf8",
        );

        expect(rewriteProductionAliases(root)).toBe(1);

        const rewritten = fs.readFileSync(file, "utf8");
        expect(rewritten).toContain("./core/thing.js");
        expect(rewritten).not.toContain(INSIDE_SPECIFIER);
    });

    it("leaves an aliased specifier in a line comment untouched", () => {
        // The alias here resolves outside the output root, so a rewriter that
        // looked at comments would throw rather than merely produce a wrong path.
        const file = join(root, "app.js");
        const comment = `// documented example: from "${OUTSIDE_SPECIFIER}"`;
        writeFileSync(
            file,
            [
                comment,
                `const { thing } = require("${INSIDE_SPECIFIER}");`,
            ].join("\n"),
            "utf8",
        );

        expect(() => rewriteProductionAliases(root)).not.toThrow();

        const rewritten = fs.readFileSync(file, "utf8");
        expect(rewritten).toContain(comment);
        expect(rewritten).toContain("./core/thing.js");
    });

    it("leaves aliased specifiers in block comments untouched", () => {
        const file = join(root, "app.js");
        const before = [
            "/*",
            ` * from "${OUTSIDE_SPECIFIER}"`,
            " */",
            "module.exports = 1;",
        ].join("\n");
        writeFileSync(file, before, "utf8");

        expect(() => rewriteProductionAliases(root)).not.toThrow();
        expect(fs.readFileSync(file, "utf8")).toBe(before);
    });

    it("counts a file as rewritten only when its code changed", () => {
        const file = join(root, "app.js");
        writeFileSync(
            file,
            `// from "${OUTSIDE_SPECIFIER}"\nmodule.exports = 1;\n`,
            "utf8",
        );

        expect(rewriteProductionAliases(root)).toBe(0);
    });
});
