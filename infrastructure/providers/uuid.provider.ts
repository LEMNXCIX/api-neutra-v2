import { v4 as uuidv4 } from "uuid";
import type { IUidProvider } from "@/core/providers/uid-provider.interface";

export class UuidProvider implements IUidProvider {
    generate(): string {
        return uuidv4();
    }
}
