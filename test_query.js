const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const user = await prisma.user.findFirst({
      select: { id: true, currency: true, currencySymbol: true }
    });
    console.log('QueryResult:', JSON.stringify(user));
  } catch (e) {
    console.error('QueryError:', (e.message || e));
    if (e.code) console.error('ErrorCode:', e.code);
  } finally {
    await prisma.$disconnect();
  }
}
main();
