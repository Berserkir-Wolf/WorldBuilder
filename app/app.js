const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || 'localhost';
const configuredBaseUrl = process.env.BASE_URL || '/';

function getApplicationUrl() {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(configuredBaseUrl)) {
    return configuredBaseUrl.endsWith('/') ? configuredBaseUrl : `${configuredBaseUrl}/`;
  }

  const basePath = configuredBaseUrl === '/'
    ? ''
    : `/${configuredBaseUrl.replace(/^\/+|\/+$/g, '')}`;

  return `http://${host}:${port}${basePath}/`;
}

app.get('/locations', (req, res) => {
  const db = new sqlite3.Database('./app_database.db');
  
  db.all("SELECT * FROM locations", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({
        locations: rows
      });
    }
  });

  db.close();
});

app.listen(port, () => {
  console.log(`Server is running on ${getApplicationUrl()}`);
});