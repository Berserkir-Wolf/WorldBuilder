const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../auth');
const applicationVersion = require('../package.json').version;

const prisma = new PrismaClient();
const initialDatabaseVersion = '1.0.0';

async function upsertById(model, row) {
  const { id, ...data } = row;

  await model.upsert({
    where: { id },
    update: data,
    create: row
  });
}

async function seedUsers() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin';
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        name: 'admin',
        email,
        username: 'admin',
        password: await hashPassword(password),
        canWrite: true,
        isAdministrator: true,
        mustResetPassword: true
      }
    });
    return;
  }

  if (!existingUser.password) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        username: existingUser.username || 'admin',
        password: await hashPassword(password),
        canWrite: true,
        isAdministrator: true,
        mustResetPassword: true
      }
    });
  } else if (!existingUser.isAdministrator || !existingUser.canWrite) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        username: existingUser.username || 'admin',
        canWrite: true,
        isAdministrator: true
      }
    });
  } else if (!existingUser.username) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { username: 'admin' }
    });
  }
}

async function seedApplicationSettings() {
  const settings = [
    { settingName: 'appname', settingValue: 'WorldBuilder' },
    { settingName: 'appversion', settingValue: applicationVersion }
  ];

  for (const setting of settings) {
    await prisma.applicationSetting.upsert({
      where: { settingName: setting.settingName },
      update: { settingValue: setting.settingValue },
      create: setting
    });
  }

  const databaseVersion = await prisma.applicationSetting.findUnique({
    where: { settingName: 'dbversion' }
  });

  if (!databaseVersion) {
    await prisma.applicationSetting.create({
      data: {
        settingName: 'dbversion',
        settingValue: initialDatabaseVersion
      }
    });
  }
}

async function seedLocations() {
  const locations = [
    { id: 1, name: 'Waterdeep', description: 'The capital city of the North.', parentLocation: null },
    { id: 2, name: 'Town Square', description: 'The central hub of the town, bustling with activity.', parentLocation: 1 },
    { id: 3, name: 'The Green Dragon Inn', description: 'A popular tavern and meeting place.', parentLocation: 1 }
  ];

  for (const location of locations) {
    await upsertById(prisma.location, location);
  }
}

async function seedCharacters() {
  const characters = [
    { id: 1, name: 'John Doe', type: 'NPC', role: 'Innkeeper', location: 3 },
    { id: 2, name: 'Jane Smith', type: 'PC', role: 'Merchant', location: 2 },
    { id: 3, name: 'The Merchants Guild', type: 'Guild', role: 'Manages merchant activities in the town', location: 1 }
  ];

  for (const character of characters) {
    await upsertById(prisma.character, character);
  }
}

async function seedCharacterDetails() {
  await upsertById(prisma.characterDetail, {
    id: 1,
    characterId: 1,
    charisma: null,
    intelligence: null,
    wisdom: null,
    dexterity: null,
    constitution: null,
    strength: null,
    race: null,
    characterClass: null,
    level: null,
    alignment: null
  });
}

async function seedReputation() {
  const reputation = [
    { id: 1, characterId: 2, targetId: 1, adjustment: 5, note: 'Helped the town during a crisis' },
    { id: 2, characterId: 1, targetId: 2, adjustment: -3, note: 'Failed to deliver goods on time' }
  ];

  for (const entry of reputation) {
    await upsertById(prisma.reputation, entry);
  }
}

async function main() {
  await seedUsers();
  await seedApplicationSettings();
  await seedLocations();
  await seedCharacters();
  await seedCharacterDetails();
  await seedReputation();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
