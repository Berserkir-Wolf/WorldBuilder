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
    image: berserkirwolf/worldbuilder:latest
    build:
      context: .
      dockerfile: app/web-app/dockerfile
    ports:
      - "8080:3000"
    environment:
      DATABASE_URL: /app/data/worldbuilder.db
      SESSION_SECRET: replace-with-a-long-random-secret
      ADMIN_EMAIL: admin@example.com
      ADMIN_PASSWORD: change-me
    volumes:
      - ./app/data:/app/data
```

The example above shows only the minimum settings needed to run the container with SQLite.

### Docker environment variables

Supported environment variables for the `web` service:

#### Core runtime

- `DATABASE_PROVIDER`
  - Default: `sqlite`
  - Supported values: `sqlite`, `mysql`
  - Controls which Prisma schema/provider is used.
- `DATABASE_URL`
  - Required for normal setups.
  - SQLite example: `/app/data/worldbuilder.db` or `file:/app/data/worldbuilder.db`
  - MySQL example: `mysql://user:password@host:3306/worldbuilder`
- `BASE_URL`
  - Default: `/`
  - Use `/` for direct hosting, or a path like `/worldbuilder` behind a reverse proxy.
  - Absolute URLs are accepted; only the path part is used for routing.
- `UPLOAD_FOLDER`
  - Default: `/app/data/uploads`
  - File-system path used for uploads.

#### Authentication and bootstrap

- `SESSION_SECRET`
  - Required in production.
  - Long random secret used to sign session cookies.
- `ADMIN_EMAIL`
  - Optional, but recommended on first run.
  - Bootstrap administrator email.
- `ADMIN_PASSWORD`
  - Optional, but recommended on first run.
  - Bootstrap administrator password.

#### MySQL connection variables (used when `DATABASE_PROVIDER=mysql` and `DATABASE_URL` is not set)

- `MYSQL_HOST` (default: `mysql`)
- `MYSQL_PORT` (default: `3306`)
- `MYSQL_DATABASE` (default: `worldbuilder`)
- `MYSQL_USER` (default: `worldbuilder`)
- `MYSQL_PASSWORD` (default: empty)

When `DATABASE_PROVIDER=mysql` and `DATABASE_URL` is not set, the container builds a MySQL URL from the `MYSQL_*` values.

For SQLite in Docker, `DATABASE_URL` can be either a plain file path (for example `/app/data/worldbuilder.db`) or a Prisma-style `file:` URL (for example `file:/app/data/worldbuilder.db`).

If `DATABASE_PROVIDER=sqlite` and `DATABASE_URL` is provided as a plain path, the container entrypoint normalizes it to a Prisma-compatible `file:` URL before running Prisma commands.

### Database providers

SQLite is the default database provider. To select it explicitly in Docker Compose, use:

```yaml
environment:
  DATABASE_PROVIDER: sqlite
  DATABASE_URL: /app/data/worldbuilder.db
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

Supplying `DATABASE_URL` directly is recommended for production deployments, especially when credentials contain special characters.

Prisma providers are selected before Prisma Client is generated. The container selects `prisma/schema.sqlite.prisma` or `prisma/schema.mysql.prisma` from `DATABASE_PROVIDER`; Prisma does not support setting the schema `provider` property directly to an environment variable.

### Authentication

The users table provides application authentication. Set the following variables for a new installation:

```yaml
environment:
  SESSION_SECRET: replace-with-a-long-random-secret
  ADMIN_EMAIL: admin@example.com
  ADMIN_PASSWORD: change-me
```

The administrator password is hashed before it is stored. Existing plaintext passwords are upgraded to scrypt hashes after a successful login. All database API routes require a signed session cookie; only `/api/auth/login`, `/api/auth/me`, and `/api/auth/logout` are unauthenticated endpoints. Authenticated users can change their password from the user menu in the top bar; password changes require the current password and a new password.

### Application pages and navigation

After signing in, the main navigation includes links for:

- `/character` for character viewing
- `/location` for location viewing
- `/sessions` for session notes viewing

Users with write permissions also have edit routes:

- `/edit/characters`
- `/edit/locations`
- `/edit/sessions`

The `/sessions` page displays each session note entry directly using the entry datetime as the header and the full notes text as the body.

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
