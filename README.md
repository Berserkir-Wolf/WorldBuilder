# WorldBuilder

[![Documentation](https://github.com/Berserkir-Wolf/WorldBuilder/actions/workflows/docs.yml/badge.svg)](https://berserkir-wolf.github.io/WorldBuilder/)

A tool for tracking campaign information in DnD/TTRPG.

This is being built using the tools below.  Note, I am not proficient in most of these, so as I learn some/many/everything will change (and I am making use of tools like GitHub CoPilot to assist me).

Languages/tools in use:
- Node.js (for the backend)
- Express.js (for the backend)
- Prisma (SQL schema builder)
- Sqlite3 (for the default database)
- Vue.js (for the frontend)
- Vuetify (for the MaterialUI frontend)
- Zensical (for the docs)
- DockerHub (for deployment)

Tools to add in the future:
- PostgreSQL (for the database)

TODO:
- [X] Add a docker-compose file for easy deployment
- [X] Add the ability to run the application in a production environment via Docker
- [ ] Add a file upload feature for images and other media attached to locations and characters
- [ ] Add a "descriptions" field to locations and characters for long-form text
- [ ] Add email support for password reset and session notes sharing
- [-] Add a "reputation" system for characters to track relationships and alliances
- [ ] Add auto-calculated modifier fields for reputation and other stats
- [X] Add a "session notes" feature for tracking campaign sessions and events
- [ ] Add a "campaigns" feature for tracking multiple campaigns and their associated characters, locations, and session notes
- [ ] Add a "worlds" feature for tracking multiple worlds and their associated campaigns, characters, locations, and session notes
- [ ] Add a "maps" feature for tracking maps and their associated locations, characters, and session notes (linked to file upload feature).
- [ ] Add a "quests" feature for tracking quests and their associated characters, locations, items, and session notes (linked to file upload feature).
- [ ] Add an "items" feature for tracking items and their associated characters, locations, quests, and session notes.
- [ ] Add ability to export and import campaign data in JSON format for backup and sharing purposes. Potentially also include application settings for database connection, email server, and other backend settings.
- [ ] Add a "settings" feature for tracking application settings and preferences, including user preferences for dark mode, language, and other UI settings. 
- [ ] Add a "users" feature for tracking users and their associated characters, locations, quests, items, and session notes. This will also include user permissions and roles for access control, as well as attaching what campaign they have access to.
- [ ] 