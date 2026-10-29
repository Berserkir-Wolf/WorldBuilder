# Contributing to WorldBuilder

Thank you for your interest in contributing to WorldBuilder. Contributions are welcome for the application, API, database model, documentation, and development tooling.

## Before you start

Please check the existing documentation and open issues before beginning work. For larger changes, open an issue first so the proposed approach can be discussed before implementation.

## Development setup

WorldBuilder uses Node.js, Express.js, Prisma, SQLite, and Vue.js. Documentation is built with Python tooling and Zensical.

### Application

Install Node.js 20 or later, then install the application dependencies:

    cd app/web-app
    npm install

Start the application with:

    npm start

The application is available at http://localhost:3000. API documentation is available at http://localhost:3000/api-docs.

For a containerized development environment, run docker compose up --build from the repository root. The containerized application is available at http://localhost:8080.

### Documentation

Install Python 3 and the documentation dependencies from the repository root:

    python -m pip install -r docs-requirements.txt

Build the documentation locally with:

    zensical build --clean

The generated site is written to site/ and is not committed.

## Repository structure

- app/web-app/client/ — Vue frontend.
- app/web-app/server.js — Express server and API routes.
- app/web-app/openapi.js — OpenAPI definition used by Swagger UI.
- app/web-app/prisma/ — Prisma schema, seed data, and versioned migrations.
- docs/ — project documentation.
- zensical.toml — documentation site configuration.

## Making changes

1. Create a focused branch from the current development branch.
2. Make the smallest change that addresses the issue or feature.
3. Keep frontend database access API-only. Database queries belong in the Express API, not Vue components.
4. Update the OpenAPI definition when changing an API route, request body, response, or supported resource.
5. Update documentation when behavior, setup, configuration, or public API contracts change.
6. Avoid committing secrets, local databases, dependency directories, or generated build output.

## Database changes

Database changes must use the versioned migration system driven by the dbversion entry in applicationsettings.

When adding a migration:

1. Add the next migration and its up function in app/web-app/prisma/migrate.js.
2. Increase currentDatabaseVersion.
3. Update schema.prisma when the data model changes.
4. Ensure migrations are incremental and safe to apply in version order.
5. Verify that dbversion is updated only after the migration succeeds.

Do not make an untracked manual schema change to a local SQLite database as a substitute for a migration.

## Validation

Run the relevant checks before submitting a change:

    cd app/web-app
    npm run build
    node --check server.js
    node --check openapi.js

When documentation changes, also run zensical build --clean. Manually verify changed API behavior through Swagger UI at /api-docs where appropriate.

## Commit and pull request guidelines

- Use a clear commit message that describes the change.
- Keep unrelated refactoring out of feature or bug-fix commits.
- Explain what changed and why in the pull request description.
- Include validation steps and their results.
- Mention database migrations, API contract changes, or configuration changes prominently.
- Update the changelog for notable user-facing changes or versioned releases.

Pull requests should be focused, documented, and ready for review. Reviewers may request changes to improve maintainability, compatibility, security, or consistency with the project architecture.
