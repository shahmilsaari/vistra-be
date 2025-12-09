import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminEmail = 'admin@sample.com';
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (admin) {
    console.log('✅ Admin user already exists');
  } else {
    const hashedPassword = await hash('12345678a', 12);

    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'admin',
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });

    console.log('✅ Created admin user:', {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });
  }

  // Create default path for admin
  const defaultPathName = 'Documents';
  const existingPath = await prisma.path.findFirst({
    where: {
      ownerId: admin.id,
      name: defaultPathName,
    },
  });

  if (existingPath) {
    console.log('✅ Default path already exists');
  } else {
    const path = await prisma.path.create({
      data: {
        name: defaultPathName,
        ownerId: admin.id,
        parentId: null,
      },
    });

    console.log('✅ Created default path:', {
      id: path.id,
      name: path.name,
      ownerId: path.ownerId,
    });
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
