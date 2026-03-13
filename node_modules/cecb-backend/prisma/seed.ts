import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CECB database...');

  const hash = (pwd: string) =>
    argon2.hash(pwd, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });

  // Create admin user
  const adminHash = await hash('Admin@1234');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cecb.cg.gov.in' },
    update: {},
    create: {
      email: 'admin@cecb.cg.gov.in',
      passwordHash: adminHash,
      name: 'CECB Administrator',
      role: 'ADMIN',
      organization: 'CECB',
    },
  });

  // Create scrutiny user
  const scrutinyHash = await hash('Scrutiny@1234');
  const scrutiny = await prisma.user.upsert({
    where: { email: 'scrutiny@cecb.cg.gov.in' },
    update: {},
    create: {
      email: 'scrutiny@cecb.cg.gov.in',
      passwordHash: scrutinyHash,
      name: 'Ravi Kumar (Scrutiny)',
      role: 'SCRUTINY',
      organization: 'CECB',
    },
  });

  // Create MoM team user
  const momHash = await hash('MomTeam@1234');
  const momUser = await prisma.user.upsert({
    where: { email: 'mom@cecb.cg.gov.in' },
    update: {},
    create: {
      email: 'mom@cecb.cg.gov.in',
      passwordHash: momHash,
      name: 'Priya Sharma (MoM Team)',
      role: 'MOM_TEAM',
      organization: 'CECB',
    },
  });

  // Create proponent user
  const proponentHash = await hash('Proponent@1234');
  const proponent = await prisma.user.upsert({
    where: { email: 'proponent@example.com' },
    update: {},
    create: {
      email: 'proponent@example.com',
      passwordHash: proponentHash,
      name: 'Amit Singh',
      role: 'PROPONENT',
      organization: 'ABC Mining Corp',
      phone: '+919876543210',
    },
  });

  // Create a demo application
  const app = await prisma.application.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      proponentId: proponent.id,
      projectName: 'Raipur Industrial Zone Expansion',
      sector: 'Industry',
      description: 'Expansion of existing industrial facility for steel manufacturing',
      district: 'Raipur',
      state: 'Chhattisgarh',
      lat: 21.2514,
      lng: 81.6296,
      areaHa: 150.5,
      investmentCr: 250,
      employmentCount: 500,
      feeAmount: 15000,
      status: 'DRAFT',
    },
  });

  // Create MoM template
  await prisma.momTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Standard Environmental Clearance MoM',
      sector: 'General',
      content: '<h2>Minutes of Meeting</h2><p>The Expert Appraisal Committee met to consider the following application for environmental clearance...</p>',
    },
  });

  console.log('✅ Seed complete!');
  console.log('\n📋 Demo Accounts:');
  console.log('   Admin:     admin@cecb.cg.gov.in     / Admin@1234');
  console.log('   Scrutiny:  scrutiny@cecb.cg.gov.in  / Scrutiny@1234');
  console.log('   MoM Team:  mom@cecb.cg.gov.in       / MomTeam@1234');
  console.log('   Proponent: proponent@example.com     / Proponent@1234');

  // Suppress unused variable warnings
  void admin; void scrutiny; void momUser; void app;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
