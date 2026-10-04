// This is the server.js file for the Docker web application. It sets up an Express server that connects to an SQL database and serves a simple API endpoint.
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

// Path to the database file inside the persistent volume directory
const dbPath = process.env.DATABASE_FILE || path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE
    )`);

    // Insert seed data if table is empty
    db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
        if (row && row.count === 0) {
            const stmt = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
            stmt.run("Alice", "alice@example.com");
            stmt.run("Bob", "bob@example.com");
            stmt.finalize();
        }
    });
});

app.get('/', (req, res) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error.");
        }
        res.json({
            message: "Hello from inside Docker with SQLite!",
            users: rows
        });
    });
});

app.listen(port, () => {
    console.log(`Web application running on port ${port}`);
});
