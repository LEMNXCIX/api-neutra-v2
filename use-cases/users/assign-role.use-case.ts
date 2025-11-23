import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { IRoleRepository } from '@/core/repositories/role.repository.interface';

export class AssignRoleToUserUseCase {
    constructor(
        private userRepository: IUserRepository,
        private roleRepository: IRoleRepository
    ) { }

    async execute(userId: string, roleId: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            return {
                success: false,
                code: 404,
                message: 'User not found',
                data: null
            };
        }

        const role = await this.roleRepository.findById(roleId);
        if (!role) {
            return {
                success: false,
                code: 404,
                message: 'Role not found',
                data: null
            };
        }

        // Update user with new roleId
        // We use the generic update method. The repository handles role relation update via roleId.
        const updatedUser = await this.userRepository.update(userId, { roleId });

        return {
            success: true,
            code: 200,
            message: 'Role assigned successfully',
            data: updatedUser
        };
    }
}
