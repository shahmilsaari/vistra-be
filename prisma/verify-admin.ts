import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
    const admin = await prisma.user.findUnique({
        where: { email: 'admin@sample.com' },
    });

    if (admin) {
        console.log('✅ Admin user found:');
        console.log({
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            createdAt: admin.createdAt,
        });
    } else {
        console.log('❌ Admin user not found');
    }
}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
