const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const currentDatabaseVersion = '1.1.0';

const migrations = [
  {
    version: '1.0.0',
    up: async () => {}
  },
  {
    version: '1.1.0',
    up: async (transaction) => {
      const provider = process.env.DATABASE_PROVIDER || 'sqlite';
      if (provider === 'mysql') {
        const columns = await transaction.$queryRawUnsafe("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users'");
        const columnNames = columns.map((column) => column.COLUMN_NAME);
        if (!columnNames.includes('can_write')) await transaction.$executeRawUnsafe('ALTER TABLE users ADD COLUMN can_write BOOLEAN NOT NULL DEFAULT FALSE');
        if (!columnNames.includes('is_administrator')) await transaction.$executeRawUnsafe('ALTER TABLE users ADD COLUMN is_administrator BOOLEAN NOT NULL DEFAULT FALSE');
        if (!columnNames.includes('must_reset_password')) await transaction.$executeRawUnsafe('ALTER TABLE users ADD COLUMN must_reset_password BOOLEAN NOT NULL DEFAULT FALSE');
        const tables = await transaction.$queryRawUnsafe("SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'sessions'");
        if (tables.length === 0) {
          await transaction.$executeRawUnsafe('CREATE TABLE sessions (id VARCHAR(255) NOT NULL PRIMARY KEY, user_id INTEGER NOT NULL, expires_at DATETIME(3) NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), updated_at DATETIME(3) NOT NULL, CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE)');
          await transaction.$executeRawUnsafe('CREATE INDEX sessions_user_id_idx ON sessions(user_id)');
        }
        return;
      }

      const columns = await transaction.$queryRawUnsafe('PRAGMA table_info(users)');
      const columnNames = columns.map((column) => column.name);
      if (!columnNames.includes('can_write')) await transaction.$executeRawUnsafe('ALTER TABLE users ADD COLUMN can_write BOOLEAN NOT NULL DEFAULT 0');
      if (!columnNames.includes('is_administrator')) await transaction.$executeRawUnsafe('ALTER TABLE users ADD COLUMN is_administrator BOOLEAN NOT NULL DEFAULT 0');
      if (!columnNames.includes('must_reset_password')) await transaction.$executeRawUnsafe('ALTER TABLE users ADD COLUMN must_reset_password BOOLEAN NOT NULL DEFAULT 0');
      const tables = await transaction.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sessions'");
      if (tables.length === 0) {
        await transaction.$executeRawUnsafe('CREATE TABLE sessions (id TEXT NOT NULL PRIMARY KEY, user_id INTEGER NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL, CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE)');
        await transaction.$executeRawUnsafe('CREATE INDEX sessions_user_id_idx ON sessions(user_id)');
      }
    }
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
