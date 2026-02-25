import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { CreateRoleDTO } from '@/core/entities/role.entity';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class CreateRoleUseCase {
    constructor(private roleRepository: IRoleRepository) { }

    async execute(tenantId: string | undefined, data: CreateRoleDTO): Promise<UseCaseResult> {
        const existingRole = await this.roleRepository.findByName(tenantId, data.name);

        if (existingRole) {
            throw new AppError('Role already exists', 409, ResourceErrorCodes.ALREADY_EXISTS);
        }

        const role = await this.roleRepository.create(tenantId, data);

        return Success(role, 'Role created successfully');
    }
}
