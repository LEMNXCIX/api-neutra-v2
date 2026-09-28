import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const distPath = path.join(__dirname, "..", "dist");

if (fs.existsSync(distPath)) {
    try {
        if (process.platform === "win32") {
            execSync(`rd /s /q "${distPath}"`);
        } else {
            execSync(`rm -rf "${distPath}"`);
        }
        console.log(`Removed ${distPath}`);
    } catch (err: any) {
        console.error("Failed to remove dist folder:", err.message || err);
        process.exit(1);
    }
} else {
    // nothing to do
}
