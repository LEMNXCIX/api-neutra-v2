/**
 * Seed Booking Data
 * Run with: npx ts-node scripts/seed-booking.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../config/db.config';

async function seedBooking() {
    console.log('🌱 Seeding booking data...');

    // Get or create a tenant
    let tenant = await prisma.tenant.findFirst();

    if (!tenant) {
        console.log('Creating default tenant...');
        tenant = await prisma.tenant.create({
            data: {
                name: 'Demo Salon',
                slug: 'demo-salon',
                type: 'BOOKING',
                active: true,
            },
        });
    }

    console.log(`Using tenant: ${tenant.name} (${tenant.id})`);

    // Create services
    console.log('Creating services...');

    const services = await Promise.all([
        prisma.service.create({
            data: {
                tenantId: tenant.id,
                name: 'Haircut',
                description: 'Professional haircut and styling',
                duration: 45,
                price: 35.00,
                category: 'Hair',
                active: true,
            },
        }),
        prisma.service.create({
            data: {
                tenantId: tenant.id,
                name: 'Hair Coloring',
                description: 'Full hair coloring service',
                duration: 120,
                price: 85.00,
                category: 'Hair',
                active: true,
            },
        }),
        prisma.service.create({
            data: {
                tenantId: tenant.id,
                name: 'Manicure',
                description: 'Professional manicure service',
                duration: 30,
                price: 25.00,
                category: 'Nails',
                active: true,
            },
        }),
        prisma.service.create({
            data: {
                tenantId: tenant.id,
                name: 'Pedicure',
                description: 'Relaxing pedicure treatment',
                duration: 45,
                price: 35.00,
                category: 'Nails',
                active: true,
            },
        }),
        prisma.service.create({
            data: {
                tenantId: tenant.id,
                name: 'Facial Treatment',
                description: 'Rejuvenating facial treatment',
                duration: 60,
                price: 65.00,
                category: 'Skincare',
                active: true,
            },
        }),
        prisma.service.create({
            data: {
                tenantId: tenant.id,
                name: 'Massage',
                description: 'Relaxing full body massage',
                duration: 60,
                price: 75.00,
                category: 'Wellness',
                active: true,
            },
        }),
    ]);

    console.log(`✓ Created ${services.length} services`);

    // Create staff
    console.log('Creating staff members...');

    const staff = await Promise.all([
        prisma.staff.create({
            data: {
                tenantId: tenant.id,
                name: 'Sarah Johnson',
                email: 'sarah@example.com',
                phone: '555-0101',
                bio: 'Expert hair stylist with 10 years of experience',
                active: true,
                workingHours: {
                    monday: { start: '09:00', end: '17:00' },
                    tuesday: { start: '09:00', end: '17:00' },
                    wednesday: { start: '09:00', end: '17:00' },
                    thursday: { start: '09:00', end: '17:00' },
                    friday: { start: '09:00', end: '17:00' },
                    saturday: null,
                    sunday: null,
                },
            },
        }),
        prisma.staff.create({
            data: {
                tenantId: tenant.id,
                name: 'Mike Chen',
                email: 'mike@example.com',
                phone: '555-0102',
                bio: 'Certified massage therapist and wellness specialist',
                active: true,
                workingHours: {
                    monday: { start: '10:00', end: '18:00' },
                    tuesday: { start: '10:00', end: '18:00' },
                    wednesday: { start: '10:00', end: '18:00' },
                    thursday: { start: '10:00', end: '18:00' },
                    friday: { start: '10:00', end: '18:00' },
                    saturday: { start: '10:00', end: '14:00' },
                    sunday: null,
                },
            },
        }),
        prisma.staff.create({
            data: {
                tenantId: tenant.id,
                name: 'Emma Rodriguez',
                email: 'emma@example.com',
                phone: '555-0103',
                bio: 'Licensed esthetician specializing in skincare',
                active: true,
                workingHours: {
                    monday: { start: '09:00', end: '17:00' },
                    tuesday: { start: '09:00', end: '17:00' },
                    wednesday: null,
                    thursday: { start: '09:00', end: '17:00' },
                    friday: { start: '09:00', end: '17:00' },
                    saturday: { start: '09:00', end: '15:00' },
                    sunday: null,
                },
            },
        }),
    ]);

    console.log(`✓ Created ${staff.length} staff members`);

    // Assign services to staff
    console.log('Assigning services to staff...');

    // Sarah - Hair services
    await prisma.staffService.createMany({
        data: [
            { tenantId: tenant.id, staffId: staff[0].id, serviceId: services[0].id }, // Haircut
            { tenantId: tenant.id, staffId: staff[0].id, serviceId: services[1].id }, // Hair Coloring
        ],
    });

    // Mike - Wellness services
    await prisma.staffService.createMany({
        data: [
            { tenantId: tenant.id, staffId: staff[1].id, serviceId: services[5].id }, // Massage
        ],
    });

    // Emma - Nails & Skincare
    await prisma.staffService.createMany({
        data: [
            { tenantId: tenant.id, staffId: staff[2].id, serviceId: services[2].id }, // Manicure
            { tenantId: tenant.id, staffId: staff[2].id, serviceId: services[3].id }, // Pedicure
            { tenantId: tenant.id, staffId: staff[2].id, serviceId: services[4].id }, // Facial
        ],
    });

    console.log('✓ Assigned services to staff');

    console.log('\n✅ Booking data seeded successfully!');
    console.log(`\nTenant ID: ${tenant.id}`);
    console.log(`Tenant Slug: ${tenant.slug}`);
    console.log('\nYou can now:');
    console.log('- Visit /services to see available services');
    console.log('- Visit /book to make an appointment');
    console.log('- Visit /admin/services to manage services');
    console.log('- Visit /admin/staff to manage staff');
}

seedBooking()
    .catch((error) => {
        console.error('Error seeding booking data:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
