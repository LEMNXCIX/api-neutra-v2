import { IUserRepository, UserCreateData } from "@/core/repositories/user.repository.interface";
import { ICartRepository } from "@/core/repositories/cart.repository.interface";
import { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { IUidProvider } from "@/core/providers/uid-provider.interface";
import { User } from "@/core/entities/user.entity";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { ProviderDataDTO } from "@/core/application/dtos/requests/user.request";

export class GetOrCreateByProviderUseCase {
    constructor(
        private userRepository: IUserRepository,
        private cartRepository: ICartRepository,
        private roleRepository: IRoleRepository,
        private uidProvider: IUidProvider,
    ) {}

    async execute(
        tenantId: string | undefined,
        data: ProviderDataDTO,
    ): Promise<UseCaseResult> {
        const providerField = `${data.provider}Id`;

        let user = await this.userRepository.findByProvider(
            providerField,
            data.idProvider,
        );

        let created = false;

        if (!user) {
            const existingUser = await this.userRepository.findByEmail(
                data.email,
            );

            if (existingUser) {
                user = await this.userRepository.linkProvider(
                    data.email,
                    providerField,
                    data.idProvider,
                    data.profilePic,
                );
            } else {
                const newPassword = this.uidProvider.generate();

                const createData: UserCreateData = {
                    name: data.name,
                    email: data.email,
                    password: newPassword,
                    profilePic: data.profilePic,
                };
                if (providerField === 'googleId') createData.googleId = data.idProvider;
                else if (providerField === 'facebookId') createData.facebookId = data.idProvider;
                else if (providerField === 'twitterId') createData.twitterId = data.idProvider;
                else if (providerField === 'githubId') createData.githubId = data.idProvider;
                user = await this.userRepository.create(createData);
                created = true;
            }
        }

        if (tenantId) {
            const alreadyInTenant = user.tenants?.some(
                (ut) =>
                    ut.tenantId === tenantId || ut.tenant?.slug === tenantId,
            );

            if (!alreadyInTenant) {
                const role = await this.roleRepository.findByName(
                    tenantId,
                    "USER",
                );

                if (role) {
                    await this.userRepository.addTenant(
                        user.id,
                        tenantId,
                        role.id,
                    );
                }

                await this.cartRepository.create(tenantId, user.id);

                user = (await this.userRepository.findById(user.id, {
                    includeRole: true,
                })) as User;
            }
        }

        return Success(
            { created, user },
            created ? "User created via provider" : "User found or linked",
        );
    }
}
