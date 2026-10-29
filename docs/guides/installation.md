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
      DATABASE_URL: file:/app/data/worldbuilder.db
      BASE_URL: /
    volumes:
      - ./app/data:/app/data
```

`BASE_URL` controls the path where the application is mounted. Use `/` for a direct local deployment, or set it to a path such as `/worldbuilder` when the application is behind a reverse proxy. An absolute URL is also accepted; its path component is used for routing.

### Database providers

SQLite is the default database provider. To select it explicitly in Docker Compose, use:

```yaml
environment:
  DATABASE_PROVIDER: sqlite
  DATABASE_URL: file:/app/data/worldbuilder.db
```

MySQL is also supported. Set `DATABASE_PROVIDER` to `mysql` and provide either `DATABASE_URL` directly or the individual MySQL connection variables:

```yaml
environment:
  DATABASE_PROVIDER: mysql
  MYSQL_HOST: mysql
  MYSQL_PORT: 3306
  MYSQL_DATABASE: worldbuilder
  MYSQL_USER: worldbuilder
  MYSQL_PASSWORD: change-me
```

When `DATABASE_PROVIDER=mysql` and `DATABASE_URL` is not set, the container builds a MySQL URL from the `MYSQL_*` variables. Supplying `DATABASE_URL` directly is recommended for production deployments, especially when credentials contain special characters.

Prisma providers are selected before Prisma Client is generated. The container selects `prisma/schema.sqlite.prisma` or `prisma/schema.mysql.prisma` from `DATABASE_PROVIDER`; Prisma does not support setting the schema `provider` property directly to an environment variable.

### Database migrations

The application stores the current database version in the `dbversion` row of `applicationsettings`. On startup, Prisma synchronizes the models, seeds missing baseline data, and applies pending application migrations in `app/web-app/prisma/migrate.js`.

To add a future migration:

1. Add a migration entry with the next version and its `up` function.
2. Increase `currentDatabaseVersion` in `app/web-app/prisma/migrate.js`.
3. Update `schema.prisma` if the migration changes the data model.

Migrations are applied in version order, and `dbversion` is updated only after each migration succeeds.

### Node.js

To run the application without Docker, install Node.js 20 or later, then run the following from the repository root:

```sh
cd app/web-app
npm install
npm start
```

Then open <http://localhost:3000>. Stop the application with `Ctrl+C`.
