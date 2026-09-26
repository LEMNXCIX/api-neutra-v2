import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const moduleRoot = path.resolve(__dirname, "..");
const projectRoot = fs.existsSync(path.join(moduleRoot, "package.json"))
    ? moduleRoot
    : path.resolve(moduleRoot, "..");
const distRoot = path.join(projectRoot, "dist");
const loadCompiledModule = createRequire(__filename);

function javascriptFiles(root: string): string[] {
    if (!fs.existsSync(root)) return [];

    const files: string[] = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const fullPath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(...javascriptFiles(fullPath));
        } else if (/\.(?:c|m)?js$/.test(entry.name)) {
            files.push(fullPath);
        }
    }
    return files;
}

function relativeAlias(
    file: string,
    alias: string,
    root: string,
): string {
    let target = path.resolve(root, alias);
    const targetRelative = path.relative(root, target);
    if (
        targetRelative === "" ||
        targetRelative.startsWith("..") ||
        path.isAbsolute(targetRelative)
    ) {
        throw new Error(`Alias escapes dist: ${alias}`);
    }

    if (!path.extname(target) && fs.existsSync(`${target}.js`)) {
        target = `${target}.js`;
    }

    let relative = path.relative(path.dirname(file), target).replace(/\\/g, "/");
    if (!relative.startsWith(".")) relative = `./${relative}`;
    return relative;
}

/**
 * A line that carries no code: a `//` comment, or any part of a block
 * comment. Aliased specifiers written inside a comment are documentation,
 * not imports, and rewriting or flagging them is wrong. This mirrors the
 * comment handling in check-architecture.ts and the doctor's rules.
 */
function isCodeLine(line: string): boolean {
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) return false;
    if (trimmed.startsWith("/*") || trimmed.startsWith("*")) return false;
    if (trimmed.startsWith("*/")) return false;
    return true;
}

function codeLines(source: string): string {
    return source
        .split("\n")
        .filter(isCodeLine)
        .join("\n");
}

export function rewriteProductionAliases(root = distRoot): number {
    if (!fs.existsSync(root)) {
        throw new Error(`Production output does not exist: ${root}`);
    }

    let rewrittenFiles = 0;
    const aliasPattern = /(['"])@\/([^'"]+)\1/g;
    for (const file of javascriptFiles(root)) {
        const source = fs.readFileSync(file, "utf8");
        // Rewrite line by line so a comment that spells out an aliased
        // specifier is left alone. Rewriting the whole source at once made a
        // comment fail the production build with `Alias escapes dist`, while
        // tsc stayed clean, so the break only surfaced at build time.
        const rewritten = source
            .split("\n")
            .map((line) =>
                isCodeLine(line)
                    ? line.replace(
                          aliasPattern,
                          (
                              _match: string,
                              quote: string,
                              alias: string,
                          ) => `${quote}${relativeAlias(file, alias, root)}${quote}`,
                      )
                    : line,
            )
            .join("\n");

        if (rewritten !== source) {
            fs.writeFileSync(file, rewritten);
            rewrittenFiles++;
        }
    }
    return rewrittenFiles;
}

function unresolvedAliasFiles(root: string): string[] {
    const aliasReference =
        /(?:\b(?:require|import)\s*\(|\bfrom\s+|\bexport\s+\*\s+from\s+)['"]@\//;
    return javascriptFiles(root).filter((file) =>
        aliasReference.test(codeLines(fs.readFileSync(file, "utf8"))),
    );
}

export function verifyProductionBuild(root = distRoot): void {
    if (!fs.existsSync(root)) {
        throw new Error(`Production output does not exist: ${root}`);
    }

    const appFile = path.join(root, "app.js");
    if (!fs.existsSync(appFile)) {
        throw new Error(`Production entrypoint is missing: ${appFile}`);
    }

    const unresolved = unresolvedAliasFiles(root);
    if (unresolved.length > 0) {
        throw new Error(
            `Unresolved @/ aliases remain in: ${unresolved.join(", ")}`,
        );
    }

    const swaggerFile = path.join(
        root,
        "infrastructure/config/swagger.config.js",
    );
    if (!fs.existsSync(swaggerFile)) {
        throw new Error(`Compiled Swagger config is missing: ${swaggerFile}`);
    }

    const swaggerModule = loadCompiledModule(swaggerFile) as {
        swaggerSpec?: { paths?: Record<string, unknown> };
    };
    const paths = swaggerModule.swaggerSpec?.paths ?? {};
    const pathCount = Object.keys(paths).length;
    if (pathCount === 0) {
        throw new Error("Compiled OpenAPI document contains no paths");
    }
    for (const requiredPath of ["/health", "/ready"]) {
        if (!paths[requiredPath]) {
            throw new Error(
                `Compiled OpenAPI document is missing ${requiredPath}`,
            );
        }
    }

    console.log(
        `Production artifact verified: ${path.relative(projectRoot, appFile)} (${pathCount} OpenAPI paths)`,
    );
}

if (require.main === module) {
    try {
        if (process.argv.includes("--rewrite")) {
            const rewritten = rewriteProductionAliases();
            console.log(`Rewrote @/ aliases in ${rewritten} artifact file(s)`);
        }
        verifyProductionBuild();
    } catch (error) {
        console.error(
            error instanceof Error ? error.message : "Production verification failed",
        );
        process.exitCode = 1;
    }
}
