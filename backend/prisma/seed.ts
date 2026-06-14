/**
 * Seed: system roles (always) + a demo gym, owner, and starter plans (dev).
 * Idempotent — safe to run repeatedly. Run with: pnpm db:seed
 */
import { hash } from '@node-rs/argon2';
import { PrismaClient, type RoleName } from '@prisma/client';
import { ALL_ROLES, ROLES, ROLE_PERMISSIONS } from '@gymflow/shared';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // 1) System roles with their default permission sets (PRODUCT_PLAN.md §9).
  for (const name of ALL_ROLES) {
    const id = `system-${name}`;
    const permissions = ROLE_PERMISSIONS[name];
    await prisma.role.upsert({
      where: { id },
      update: { permissions, isSystem: true },
      create: { id, name: name as RoleName, permissions, isSystem: true },
    });
  }
  console.log(`Seeded ${ALL_ROLES.length} system roles`);

  // 1b) Platform super-admin (operates the SaaS — manages all gyms). gym_id stays null.
  const superAdminRoleId = `system-${ROLES.SUPER_ADMIN}`;
  const adminHash = await hash('Admin123!');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gymflow.app' },
    update: {},
    create: {
      email: 'admin@gymflow.app',
      passwordHash: adminHash,
      fullName: 'Platform Admin',
      emailVerifiedAt: new Date(),
    },
  });
  const hasAdminRole = await prisma.userRole.findFirst({
    where: { userId: admin.id, roleId: superAdminRoleId, gymId: null },
  });
  if (!hasAdminRole) {
    await prisma.userRole.create({ data: { userId: admin.id, roleId: superAdminRoleId, gymId: null } });
  }
  console.log('Seeded platform admin → admin@gymflow.app / Admin123!');

  // 2) Demo gym.
  const gym = await prisma.gym.upsert({
    where: { slug: 'demo-gym' },
    update: {},
    create: { name: 'Demo Gym', slug: 'demo-gym', currency: 'USD', timezone: 'UTC' },
  });

  // 3) Demo owner account.
  const passwordHash = await hash('Password123!');
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.gym' },
    update: {},
    create: {
      email: 'owner@demo.gym',
      passwordHash,
      fullName: 'Demo Owner',
      gymId: gym.id,
      emailVerifiedAt: new Date(),
    },
  });
  if (gym.ownerUserId !== owner.id) {
    await prisma.gym.update({ where: { id: gym.id }, data: { ownerUserId: owner.id } });
  }

  // 4) Assign the gym_owner role to the demo owner.
  const ownerRoleId = `system-${ROLES.GYM_OWNER}`;
  await prisma.userRole.upsert({
    where: { userId_roleId_gymId: { userId: owner.id, roleId: ownerRoleId, gymId: gym.id } },
    update: {},
    create: { userId: owner.id, roleId: ownerRoleId, gymId: gym.id },
  });

  // 5) Starter membership plans.
  const plans = [
    { name: 'Monthly', durationDays: 30, price: 30 },
    { name: 'Quarterly', durationDays: 90, price: 80 },
    { name: 'Annual', durationDays: 365, price: 300 },
  ];
  for (const p of plans) {
    const existing = await prisma.membershipPlan.findFirst({
      where: { gymId: gym.id, name: p.name },
    });
    if (!existing) {
      await prisma.membershipPlan.create({
        data: {
          gymId: gym.id,
          name: p.name,
          durationDays: p.durationDays,
          price: p.price,
          currency: 'USD',
        },
      });
    }
  }

  console.log('Seed complete. Demo owner login → owner@demo.gym / Password123!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
