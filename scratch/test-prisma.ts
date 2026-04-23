import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: ['query', 'info', 'error'],
  })
}

const prisma = prismaClientSingleton()

async function main() {
  console.log("Starting debug query...");
  try {
    const sessions = await prisma.streamSession.findMany({
      where: { status: "ACTIVE" },
      include: { 
        streamer: { 
          include: { 
            accounts: { where: { provider: 'twitch' } } 
          } 
        } 
      },
      take: 1
    });
    console.log("Success! Sessions count:", sessions.length);
  } catch (err) {
    console.error("DEBUG ERROR:", err);
    if (err.meta) console.log("META:", err.meta);
  } finally {
    await prisma.$disconnect();
  }
}

main();
