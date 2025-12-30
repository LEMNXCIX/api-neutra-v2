import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { CreateUserDTO } from '@/core/entities/user.entity';

export class CreateUserUseCase {
    constructor(
        private userRepository: IUserRepository,
        private cartRepository: ICartRepository
    ) { }

    async execute(tenantId: string | undefined, data: CreateUserDTO) {
        try {
            const user = await this.userRepository.create(data);

            // If tenantId provided, associate user with tenant
            if (tenantId) {
                const { prisma } = await import('@/config/db.config');
                const role = await prisma.role.findFirst({
                    where: { name: 'USER', tenantId: tenantId }
                });

                if (role) {
                    await this.userRepository.addTenant(user.id, tenantId, role.id);
                }

                // Create cart for new user in this tenant context
                await this.cartRepository.create(tenantId, user.id);
            }

            return {
                success: true,
                code: 201,
                message: "User created",
                data: { created: true, user }
            };
        } catch (error: any) {
            // Handle unique constraint violation (duplicate email)
            const msg = error.code === 'P2002' ? "Email already exists" : "Error creating user";

            return {
                success: false,
                code: 400,
                message: msg,
                errors: [error.message]
            };
        }
    }
}
