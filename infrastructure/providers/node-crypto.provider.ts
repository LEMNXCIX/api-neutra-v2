import { ICryptoProvider } from "@/core/providers/crypto-provider.interface";
import crypto from "crypto";

export class NodeCryptoProvider implements ICryptoProvider {
    randomBytes(size: number): string {
        return crypto.randomBytes(size).toString("hex");
    }
}
