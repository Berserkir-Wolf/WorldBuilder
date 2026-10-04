# Installation

**Note**: After installing the system, you will need to enter in the information for your world/campaign.  

***

## Docker

```yaml
version: '3.8'

services:
  web:
    build: ./web-app
    restart: always
    ports:
      - "8080:3000"
    environment:
      - DATABASE_FILE=/app/data/production.db
    volumes:
      # Mounts the local data directory to persist the SQLite file
      - ./data:/app/data
```
