import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

const templatesPath = path.join(process.cwd(), 'infrastructure', 'email-templates');
const outputPath = path.join(templatesPath, 'verification');

if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
}

const tenantConfig = {
    tenantName: 'Neutra Demo',
    primaryColor: '#6da',
    tenantLogo: 'https://via.placeholder.com/150',
    websiteUrl: 'https://demo.neutra.com',
    supportEmail: 'support@demo.neutra.com'
};

const templates = [
    {
        name: 'welcome',
        data: { name: 'John Doe' }
    },
    {
        name: 'appointment-confirmation',
        data: {
            userName: 'John Doe',
            serviceName: 'Haircut',
            staffName: 'Alice Smith',
            appointmentDate: '2025-01-01',
            appointmentTime: '10:00 AM',
            duration: 30,
            notes: 'Prefer silent appointment',
            appointmentId: '12345',
            calendarLink: '#'
        }
    },
    {
        name: 'appointment-cancellation',
        data: {
            userName: 'John Doe',
            serviceName: 'Haircut',
            staffName: 'Alice Smith',
            appointmentDate: '2025-01-01',
            appointmentTime: '10:00 AM',
            cancellationReason: 'Scheduling conflict',
            appointmentId: '12345'
        }
    },
    {
        name: 'appointment-reminder',
        data: {
            userName: 'John Doe',
            serviceName: 'Haircut',
            staffName: 'Alice Smith',
            appointmentDate: '2025-01-01',
            appointmentTime: '10:00 AM',
            duration: 30,
            appointmentId: '12345'
        }
    },
    {
        name: 'appointment-pending-approval',
        data: {
            staffName: 'Alice Smith',
            userName: 'John Doe',
            serviceName: 'Haircut',
            appointmentDate: '2025-01-01',
            appointmentTime: '10:00 AM',
            duration: 30,
            notes: 'First time customer',
            approveLink: 'https://api.neutra.com/approve',
            rejectLink: 'https://api.neutra.com/reject'
        }
    },
    {
        name: 'order-confirmation',
        data: {
            order: {
                id: 'ORD-001',
                createdAt: '2025-01-01',
                status: 'PAID',
                total: '50.00',
                items: [
                    { productName: 'Shampoo', quantity: 2, price: '15.00' },
                    { productName: 'Conditioner', quantity: 1, price: '20.00' }
                ]
            }
        }
    },
    {
        name: 'password-reset',
        data: {
            resetLink: 'https://demo.neutra.com/reset-password?token=123'
        }
    }
];

async function verify() {
    console.log('Starting verification...');

    // Load Base Layout
    const layoutPath = path.join(templatesPath, 'base-layout.hbs');
    if (!fs.existsSync(layoutPath)) {
        console.error('Base layout not found!');
        return;
    }
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    const compiledLayout = handlebars.compile(layoutContent);

    for (const t of templates) {
        console.log(`Verifying ${t.name}...`);
        const itemPath = path.join(templatesPath, `${t.name}.hbs`);
        if (!fs.existsSync(itemPath)) {
            console.error(`  - Template ${t.name} not found!`);
            continue;
        }

        const itemContent = fs.readFileSync(itemPath, 'utf-8');
        const compiledItem = handlebars.compile(itemContent);

        const emailData = {
            ...t.data,
            tenant: tenantConfig,
            year: new Date().getFullYear(),
        };

        const contentHtml = compiledItem(emailData);
        const finalHtml = compiledLayout({
            ...emailData,
            content: contentHtml,
        });

        const out = path.join(outputPath, `${t.name}.html`);
        fs.writeFileSync(out, finalHtml);
        console.log(`  - Generated ${out}`);
    }
    console.log('Verification complete.');
}

verify();
