import crypto from "node:crypto";
import type { ICryptoProvider } from "@/core/providers/crypto-provider.interface";

export class NodeCryptoProvider implements ICryptoProvider {
    randomBytes(size: number): string {
        return crypto.randomBytes(size).toString("hex");
    }
}
