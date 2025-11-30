import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'admin@gmail.com';
  const agentEmail = 'agent@gmail.com';
  const password = await bcrypt.hash('Example1', 10);

  const admin = await prisma.user.createMany({
    data: [
      {
        email: adminEmail,
        password: password,
        name: 'Admin',
        role: Role.ADMIN,
        commissionRate: 10,
        isActive: true,
      },
      {
        email: agentEmail,
        password: password,
        name: 'Agent',
        role: Role.AGENT,
        commissionRate: 10,
        isActive: true,
      },
    ],
  });

  console.log({ admin });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
