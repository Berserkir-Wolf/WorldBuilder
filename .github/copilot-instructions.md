# Copilot Instructions

## Project Guidelines
- Database schema changes should use a versioned migration system driven by the applicationsettings dbversion entry, applying incremental migrations until the database reaches the current version.
- Docker build context and ignore rules should be repository-wide, with only the application files explicitly allowed into the image build context so documentation and unrelated repository files are excluded. The Docker image should be named `berserkirwolf/worldbuilder`, using the repository owner's Docker Hub namespace rather than the default `worldbuilder` name. Use docker-compose defaults that do not require APP_VERSION arguments; the default image tag should be the application version, with the `latest` tag applied to the most recent successful version build. The Docker image should be built with a single stage that includes both the frontend and backend, with no separate frontend-only image.
- The repository's .gitignore must retain Python-related exclusions because the documentation build uses Python tooling, in addition to Node/Vue project exclusions.

## UI Guidelines
- When UI changes are made, always rebuild and restart the running container for validation.
- Top-level pages should have a consistent layout with a top navigation bar and a left sidebar for navigation. The sidebar should be collapsible and overlay the main content when open.
- Place the hamburger menu at the top-left position.

## Version Control Guidelines
- Only create Git commits when explicitly and manually instructed by the user; do not auto-commit after making changes.