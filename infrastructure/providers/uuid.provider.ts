import { IUidProvider } from "@/core/providers/uid-provider.interface";
import { v4 as uuidv4 } from "uuid";

export class UuidProvider implements IUidProvider {
    generate(): string {
        return uuidv4();
    }
}
