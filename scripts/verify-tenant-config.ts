
import { TenantPrismaRepository } from '../infrastructure/database/prisma/tenant.prisma-repository';
import { CreateTenantUseCase } from '../core/application/tenant/create-tenant.use-case';
import { UpdateTenantUseCase } from '../core/application/tenant/update-tenant.use-case';
import { TenantType } from '../core/entities/tenant.entity';
import { ILogger } from '../core/providers/logger.interface';

// Mock Logger
const mockLogger: ILogger = {
    debug: () => { },
    info: console.log,
    warn: console.warn,
    error: console.error,
    logRequest: () => { },
    logResponse: () => { },
};

async function verify() {
    const repository = new TenantPrismaRepository();
    const createUseCase = new CreateTenantUseCase(repository, mockLogger);
    const updateUseCase = new UpdateTenantUseCase(repository, mockLogger);

    const slug = `test-tenant-${Date.now()}`;
    console.log(`Creating tenant with slug: ${slug}`);

    // 1. Create Tenant with Config
    const createResult = await createUseCase.execute({
        name: 'Test Tenant Config',
        slug: slug,
        type: TenantType.STORE,
        config: {
            branding: {
                primaryColor: '#ff0000',
                tenantLogo: 'https://example.com/logo.png',
            },
            settings: {
                supportEmail: 'test@example.com',
                currency: 'USD',
            }
        }
    });

    if (!createResult.success || !createResult.data) {
        console.error('Failed to create tenant:', createResult);
        process.exit(1);
    }

    const tenantId = createResult.data.id;
    console.log('Tenant created successfully:', tenantId);
    console.log('Initial Config:', JSON.stringify(createResult.data.config, null, 2));

    // Verify initial config
    if (createResult.data.config?.branding?.primaryColor !== '#ff0000') {
        console.error('Initial primaryColor mismatch');
        process.exit(1);
    }

    // 2. Update Tenant Config (Partial Update of Branding)
    console.log('Updating tenant branding...');
    const updateResult = await updateUseCase.execute(tenantId, {
        config: {
            branding: {
                primaryColor: '#00ff00', // Change color
            }
        }
    });

    if (!updateResult.success || !updateResult.data) {
        console.error('Failed to update tenant:', updateResult);
        process.exit(1);
    }

    console.log('Updated Config:', JSON.stringify(updateResult.data.config, null, 2));

    // Verify merging
    // Should have new color
    if (updateResult.data.config?.branding?.primaryColor !== '#00ff00') {
        console.error('Updated primaryColor mismatch');
        process.exit(1);
    }
    // Should keep logo (deep merge check)
    if (updateResult.data.config?.branding?.tenantLogo !== 'https://example.com/logo.png') {
        console.error('Deep merge failed: tenantLogo lost');
        process.exit(1);
    }
    // Should keep settings (sibling section check)
    if (updateResult.data.config?.settings?.supportEmail !== 'test@example.com') {
        console.error('Merge failed: settings lost');
        process.exit(1);
    }

    // Cleanup
    console.log('Cleaning up...');
    await repository.delete(tenantId);
    console.log('Verification passed!');
}

verify().catch(console.error);
