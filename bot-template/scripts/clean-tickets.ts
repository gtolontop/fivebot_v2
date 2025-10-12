import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTickets() {
  try {
    console.log('🧹 Cleaning all ticket data...');

    // Delete in correct order due to foreign key constraints
    const deletedMessages = await prisma.ticketMessage.deleteMany({});
    console.log(`✅ Deleted ${deletedMessages.count} ticket messages`);

    const deletedParticipants = await prisma.ticketParticipant.deleteMany({});
    console.log(`✅ Deleted ${deletedParticipants.count} ticket participants`);

    const deletedLogs = await prisma.ticketLog.deleteMany({});
    console.log(`✅ Deleted ${deletedLogs.count} ticket logs`);

    const deletedTickets = await prisma.ticket.deleteMany({});
    console.log(`✅ Deleted ${deletedTickets.count} tickets`);

    const deletedConfigs = await prisma.ticketConfig.deleteMany({});
    console.log(`✅ Deleted ${deletedConfigs.count} ticket configs`);

    console.log('\n✨ All ticket data has been cleaned successfully!');
  } catch (error) {
    console.error('❌ Error cleaning tickets:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanTickets()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
