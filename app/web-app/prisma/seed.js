const { PrismaClient } = require('@prisma/client');

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
  await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: { name: 'Alice' },
    create: { name: 'Alice', email: 'alice@example.com' }
  });

  await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: { name: 'Bob' },
    create: { name: 'Bob', email: 'bob@example.com' }
  });
}

async function seedApplicationSettings() {
  const settings = [
    { settingName: 'appname', settingValue: 'My Application' },
    { settingName: 'appversion', settingValue: '1.0.0' }
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
