const { PrismaClient } = require('./app/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  try {
    const ent = await prisma.entreprise.findFirst({ include: { user: true } });
    if (!ent) {
      console.log('No entreprise found');
      return;
    }
    console.log('Found entreprise:', ent.id, 'User:', ent.userId, 'Status:', ent.user?.status);
    
    // Try updating status
    const updatedUser = await prisma.user.update({
      where: { id: ent.userId },
      data: { status: 'SUSPENDU' }
    });
    console.log('User status updated successfully:', updatedUser.status);
    
    // Try invalidating
    const updatedEnt = await prisma.entreprise.update({
      where: { id: ent.id },
      data: { validePar: null, dateValidation: null }
    });
    console.log('Entreprise updated successfully:', updatedEnt.validePar);
  } catch (e) {
    console.error('Prisma Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
