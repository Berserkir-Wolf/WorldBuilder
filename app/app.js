const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

app.get('/users', (req, res) => {
  const db = new sqlite3.Database('./app_database.db');
  
  db.all("SELECT * FROM users", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({
        users: rows
      });
    }
  });

  db.close();
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});