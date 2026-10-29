# Copilot Instructions

## Project Guidelines
- Database schema changes should use a versioned migration system driven by the applicationsettings dbversion entry, applying incremental migrations until the database reaches the current version.
- Docker build context and ignore rules should be repository-wide, with only the application files explicitly allowed into the image build context so documentation and unrelated repository files are excluded. The Docker image should be named `berserkirwolf/worldbuilder`, using the repository owner's Docker Hub namespace rather than the default `worldbuilder` name.
- The repository's .gitignore must retain Python-related exclusions because the documentation build uses Python tooling, in addition to Node/Vue project exclusions.