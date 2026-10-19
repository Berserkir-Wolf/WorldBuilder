# Installation

**Note**: After installing the system, you will need to enter in the information for your world/campaign.  

## Docker

The primary deployment method of this application will be via Docker. If you wish to run the application in a production environment, please run it via docker using the published image (coming soon).
If you wish to run it locally, you will need to deploy it via Node.js using the development instructions below.


## Development Environment

If you wish to run the application in a development environment, please follow the instructions below. If you wish to run the application in a production environment, please run it via docker using the published image (coming soon).


### Docker

The easiest way to run the application locally is with Docker Desktop and Docker Compose. From the repository root, run:

```sh
docker compose up --build
```

Then open <http://localhost:8080>. The SQLite database is persisted in `app/data`. Stop the application with `Ctrl+C`, or run the following from another terminal:

```sh
docker compose down
```

The Compose configuration is stored in `docker-compose.yml` at the repository root:

```yaml
services:
  web:
    build:
      context: ./app/web-app
    ports:
      - "8080:3000"
    environment:
      DATABASE_FILE: /app/data/worldbuilder.db
    volumes:
      - ./app/data:/app/data
```

### Node.js

To run the application without Docker, install Node.js 20 or later, then run the following from the repository root:

```sh
cd app/web-app
npm install
npm start
```

Then open <http://localhost:3000>. Stop the application with `Ctrl+C`.
