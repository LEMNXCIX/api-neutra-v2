import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { ICartRepository } from "@/core/repositories/cart.repository.interface";
import { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { CreateUserDTO } from "@/core/application/dtos/requests/user.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class CreateUserUseCase {
    constructor(
        private userRepository: IUserRepository,
        private cartRepository: ICartRepository,
        private roleRepository: IRoleRepository,
    ) {}

    async execute(
        tenantId: string | undefined,
        data: CreateUserDTO,
    ): Promise<UseCaseResult> {
        const user = await this.userRepository.create(data);

        if (tenantId) {
            const role = await this.roleRepository.findByName(tenantId, "USER");
            if (role) {
                await this.userRepository.addTenant(user.id, tenantId, role.id);
            }
            await this.cartRepository.create(tenantId, user.id);
        }

        return Success({ created: true, user }, "User created");
    }
}
