/**
 * Additive demo-history seeder for the demo gym — creates ~6 months of members,
 * payments, attendance, and expenses so Reports/Dashboard charts have real data.
 * Idempotent-ish: skips if the gym already has a large roster.
 *
 * Run:  DATABASE_URL=... node scripts/seed-demo-history.cjs
 */
const { PrismaClient } = require('@prisma/client');
const { randomBytes } = require('node:crypto');

const prisma = new PrismaClient();

const FIRST = ['Aisha', 'Bilal', 'Sara', 'Hamza', 'Zara', 'Omar', 'Noor', 'Ali', 'Hina', 'Usman', 'Maria', 'Daniyal', 'Fatima', 'Saad', 'Ayesha', 'Talha', 'Mehak', 'Faizan', 'Rabia', 'Imran', 'Sana', 'Kashif', 'Iqra', 'Bilawal', 'Komal', 'Hassan', 'Areeba', 'Zain', 'Mahnoor', 'Asad'];
const LAST = ['Khan', 'Ahmed', 'Malik', 'Sheikh', 'Butt', 'Raza', 'Iqbal', 'Hussain', 'Javed', 'Qureshi', 'Farooq', 'Nadeem', 'Saleem', 'Akhtar', 'Rashid'];

function tok(n = 12) {
  return randomBytes(n).toString('hex');
}
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(rand(7, 21), rand(0, 59), 0, 0);
  return d;
}

async function main() {
  const gym = await prisma.gym.findFirst({ where: { slug: 'demo-gym', deletedAt: null } });
  if (!gym) throw new Error('demo-gym not found');

  const count = await prisma.member.count({ where: { gymId: gym.id } });
  if (count >= 25) {
    console.log(`demo gym already has ${count} members — skipping (already seeded).`);
    return;
  }

  const plans = await prisma.membershipPlan.findMany({
    where: { gymId: gym.id, isActive: true, deletedAt: null },
    orderBy: { price: 'asc' },
  });
  if (plans.length === 0) throw new Error('no active plans on demo gym');

  const now = new Date();
  const createdMemberIds = [];
  const N = 28;

  for (let i = 0; i < N; i++) {
    const joined = new Date(now);
    joined.setDate(joined.getDate() - rand(5, 178)); // spread over ~6 months
    joined.setHours(12, 0, 0, 0);
    const name = `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`;
    const plan = plans[rand(0, plans.length - 1)];
    const price = Number(plan.price);

    const member = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { gymId: gym.id, fullName: name, email: null, phone: `03${rand(100000000, 999999999)}` } });
      const m = await tx.member.create({
        data: {
          gymId: gym.id,
          userId: user.id,
          memberCode: `M${2000 + i}`,
          checkInToken: tok(),
          referralCode: tok(4).toUpperCase(),
          joinedAt: joined,
          status: 'active',
        },
      });
      const end = new Date(joined);
      end.setDate(end.getDate() + plan.durationDays);
      const membership = await tx.membership.create({
        data: { gymId: gym.id, memberId: m.id, planId: plan.id, startDate: joined, endDate: end, status: 'active', pricePaid: price },
      });
      await tx.payment.create({
        data: {
          gymId: gym.id,
          memberId: m.id,
          membershipId: membership.id,
          amount: price,
          currency: plan.currency,
          method: 'cash',
          status: 'paid',
          paidAt: joined,
          invoiceNumber: `INV-DH-${Date.now()}-${i}`,
        },
      });
      // ~40% renew a month or two later → extra revenue points
      if (Math.random() < 0.4) {
        const renew = new Date(joined);
        renew.setDate(renew.getDate() + plan.durationDays);
        if (renew < now) {
          await tx.payment.create({
            data: {
              gymId: gym.id,
              memberId: m.id,
              membershipId: membership.id,
              amount: price,
              currency: plan.currency,
              method: 'cash',
              status: 'paid',
              paidAt: renew,
              invoiceNumber: `INV-DH-${Date.now()}-${i}-r`,
            },
          });
        }
      }
      return m;
    });
    createdMemberIds.push(member.id);
  }

  // Attendance — last 30 days, ~10-26 check-ins/day across the roster
  const allMembers = await prisma.member.findMany({ where: { gymId: gym.id, deletedAt: null }, select: { id: true } });
  const ids = allMembers.map((m) => m.id);
  let attCount = 0;
  for (let d = 0; d < 30; d++) {
    const visits = rand(10, 26);
    for (let v = 0; v < visits; v++) {
      await prisma.attendance.create({
        data: { gymId: gym.id, memberId: ids[rand(0, ids.length - 1)], checkedInAt: daysAgo(d), method: 'manual' },
      });
      attCount++;
    }
  }

  // Expenses — a couple per month for 6 months so the expenses chart fills in
  const EXP = [
    { category: 'rent', amount: 1500 },
    { category: 'utilities', amount: 280 },
    { category: 'salary', amount: 2200 },
    { category: 'equipment', amount: 600 },
  ];
  let expCount = 0;
  for (let mo = 0; mo < 6; mo++) {
    const when = new Date(now);
    when.setMonth(when.getMonth() - mo);
    when.setDate(3);
    for (const e of EXP.slice(0, rand(2, 4))) {
      await prisma.expense.create({
        data: { gymId: gym.id, category: e.category, amount: e.amount + rand(-100, 150), currency: gym.currency, incurredOn: when, description: `${e.category} (demo)` },
      });
      expCount++;
    }
  }

  console.log(`Seeded: ${N} members + memberships + payments, ${attCount} attendance, ${expCount} expenses for ${gym.name}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
