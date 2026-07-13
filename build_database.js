const sqlite3 = require('sqlite3').verbose();

// Create or open the database
const db = new sqlite3.Database('./app_database.db');

// Create a table (if it doesn't exist)
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, parent_location INT)");
  db.run("CREATE TABLE IF NOT EXISTS characters (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, type TEXT, role TEXT, location INT)");
  db.run("CREATE TABLE IF NOT EXISTS characterdetails (id INTEGER PRIMARY KEY AUTOINCREMENT, character_id INT, charisma INT, intelligence INT, wisdom INT, dexterity INT, constitution INT, strength INT, race TEXT, class TEXT, level INT, alignment TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS reputation (id INTEGER PRIMARY KEY AUTOINCREMENT, character_ID INT, target_ID INT, adjustment INT, note TEXT)");

  // Add some data
  const buildlocations = db.prepare("INSERT INTO locations VALUES (NULL, ?, ?, ?)");
  buildlocations.run('Waterdeep', 'The capital city of the North.', null);
  buildlocations.run('Town Square', 'The central hub of the town, bustling with activity.', '1');
  buildlocations.run('The Green Dragon Inn', 'A popular tavern and meeting place.', '1');
  buildlocations.finalize();
  
  const buildcharacters = db.prepare("INSERT INTO characters VALUES (NULL, ?, ?, ?, ?)");
  buildcharacters.run('John Doe', 'NPC', 'Innkeeper', '1', '3');
  buildcharacters.run('Jane Smith', 'PC', 'Merchant', '1', '2');
  buildcharacters.run('The Merchants Guild', 'Guild', 'Manages merchant activities in the town', '1', '1');
  buildcharacters.finalize();
 
  const buildrep = db.prepare("INSERT INTO reputation VALUES (NULL, ?, ?, ?, ?)");
  buildrep.run('2', '1', '5', 'Helped the town during a crisis');
  buildrep.run('1', '2', '-3', 'Failed to deliver goods on time');
  buildrep.finalize();
});

// Close the database
db.close();