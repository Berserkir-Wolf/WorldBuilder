# Changelog

All notable changes to WorldBuilder are documented on this page.

The application version is maintained in [`app/web-app/package.json`](https://github.com/Berserkir-Wolf/WorldBuilder/blob/node/app/web-app/package.json).

## [Unreleased]

Changes that have not yet been included in a versioned release.

### Added

- Reserved for upcoming changes.

## [0.0.2]

Authentication, authorization, administration, and database-management improvements.

### Added

- Added `/login`, `/`, and `/admin` application routes with redirect-back behavior after successful authentication.
- Added a records page that lets authenticated users view records from each supported table.
- Added administrator user and application-name management at `/admin`.

### Changed

- Limited record creation, editing, and deletion to users with write privileges while retaining read access for authenticated read-only users.
- Added persistent Prisma-backed session storage for authenticated sessions.
- Updated the application title and interface header from the configured application name.
- Incremented the application and Docker image version to 0.0.2.

### Fixed

- Made the 1.1.0 database migration idempotent when `prisma db push` has already created the new permission columns and sessions table.
- Corrected password-hash parsing used during administrator authentication.

## [0.0.1]

Initial development version.

### Added

- Express.js backend with Prisma and SQLite database support.
- Vue.js frontend for managing worldbuilder records.
- API-based database access for users, settings, locations, characters, character details, and reputation records.
- Swagger UI API documentation at `/api-docs`.
- Installation and project documentation.

<!--
When releasing a new version:
1. Update the version in app/web-app/package.json.
2. Rename the Unreleased section to the new version and add its release date.
3. Add a new Unreleased section above it.
4. Group changes under Added, Changed, Fixed, Removed, or Security.
-->
