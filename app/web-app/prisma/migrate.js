const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const currentDatabaseVersion = '1.0.0';

const migrations = [
  {
    version: '1.0.0',
    up: async () => {}
  }
];

function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const leftPart = leftParts[index] || 0;
    const rightPart = rightParts[index] || 0;

    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }

  return 0;
}

async function main() {
  const setting = await prisma.applicationSetting.findUnique({
    where: { settingName: 'dbversion' }
  });
  const storedVersion = setting?.settingValue || '0.0.0';

  if (compareVersions(storedVersion, currentDatabaseVersion) > 0) {
    throw new Error(`Database version ${storedVersion} is newer than application version ${currentDatabaseVersion}.`);
  }

  const pendingMigrations = migrations
    .filter((migration) => compareVersions(migration.version, storedVersion) > 0)
    .filter((migration) => compareVersions(migration.version, currentDatabaseVersion) <= 0)
    .sort((left, right) => compareVersions(left.version, right.version));

  for (const migration of pendingMigrations) {
    await prisma.$transaction(async (transaction) => {
      await migration.up(transaction);
      await transaction.applicationSetting.update({
        where: { settingName: 'dbversion' },
        data: { settingValue: migration.version }
      });
    });

    console.log(`Applied database migration ${migration.version}`);
  }
}

main()
  .catch((error) => {
    console.error('Database migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
