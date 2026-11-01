# Database Schema

## Core tables

- `users`: application users and permissions.
- `applicationsettings`: application configuration values such as app name, base URL, and db version.
- `locations`: location records used by the world/campaign.
- `characters`: character records, including optional affiliation/location links.
- `characterdetails`: supplemental detail fields for supported character types.
- `reputation`: relationship adjustments between characters.
- `characternotes`: freeform notes linked to characters.
- `locationnotes`: freeform notes linked to locations.
- `sessionnotes`: session-log entries with timestamped notes.

## Session notes table

`sessionnotes` stores campaign/session log text.

- `id`: integer primary key (auto-increment)
- `created_at`: datetime populated automatically when a record is created
- `notes`: large text field for long-form notes (supports line breaks)
