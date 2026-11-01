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
- [ ] Add the ability to run the application in a production environment via Docker
- [ ] Add a simplified docker compose example for production deployment
	- [ ] Default options only, no advanced configuration
- [ ] Add a file upload feature for images and other media attached to locations and characters
- [ ] Add a "descriptions" field to locations and characters for long-form text
- [ ] Add email support for password reset and session notes sharing
	- [ ] Include email server configuration in the settings feature
	- [ ] Implement email templates for password reset and session notes sharing
	- [ ] Include email verification for new users?
	- [ ] Implement email notifications for campaign events and updates
	- [ ] Include option for users to opt-in or opt-out of email notifications
	- [ ] Include option for users to customize their email notification preferences
	- [ ] Include OAuth2 support for mail sender authentication (e.g., Gmail, Outlook, etc.)
	- [ ] Include option for users to customize their email sender name and email address
- [X] Add a "reputation" system for characters to track relationships and alliances
	- [ ] Add auto-calculated modifier fields for reputation
- [X] Add a "session notes" feature for tracking campaign sessions and events
- [ ] Add a "campaigns" feature for tracking multiple campaigns and their associated characters, locations, and session notes
- [ ] Add a "worlds" feature for tracking multiple worlds and their associated campaigns, characters, locations, and session notes
- [ ] Add a "maps" feature for tracking maps and their associated locations, characters, and session notes (linked to file upload feature).
- [ ] Add a "quests" feature for tracking quests and their associated characters, locations, items, and session notes (linked to file upload feature).
- [ ] Add an "items" feature for tracking items and their associated characters, locations, quests, and session notes.
- [ ] Add auto-calculated fields for character stats, including health, mana, stamina, and other relevant attributes.
	- [ ] Include modifiers for character rolls based on their stats.
- [ ] Add ability to export and import campaign data in JSON format for backup and sharing purposes. Potentially also include application settings for database connection, email server, and other backend settings.
- [ ] Add a "settings" feature for tracking application settings and preferences, including user preferences for dark mode, language, and other UI settings. 
- [ ] Extend the "users" feature to tracking users and their associated characters, locations, quests, items, and session notes. This will also include user permissions and roles for access control, as well as attaching what campaign they have access to.
- [ ] Add a "logs" feature for tracking application logs and events, including user activity, errors, and other relevant information. This will also include log filtering and searching capabilities.
- [ ] Add a PWA (Progressive Web App) feature for offline access. This will also include service worker implementation and caching strategies.
- [ ]Remove the "edit" pages and replace them with a single "view" page for each entity type (characters, locations, sessions, etc.). This will simplify the user interface and reduce the number of pages in the application.
- [ ] For users with write permissions, add an "edit" button (using the material edit icon) to the view page that opens a modal or separate page for editing the entity. This will allow for a more streamlined user experience and prevent accidental edits.
- [ ] Add a dropdown at the top to show what campaign the user is currently viewing.  This will allow users to easily switch between campaigns and view their associated characters, locations, quests, items, and session notes.
- [ ] Build a permissions structure for users to have access to specific campaigns, and for admins to manage user permissions and roles.  This will allow for more granular control over who can view and edit campaign data. This will also include the ability to assign users to specific campaigns and manage their access levels, as well as the ability to create and manage campaigns.
- [ ] This needs to be built in a way that allows for future expansion to include multiple worlds, with each world having its own set of campaigns, characters, locations, quests, items, and session notes.  This will allow for a more flexible and scalable application that can accommodate different types of campaigns and settings. Alternately, campaigns need to be able to be linked to a world, and worlds need to be able to be linked to campaigns.  This will allow for a more flexible and scalable application that can accommodate different types of campaigns and settings. Potentially, for each campaign, it can be linked to a world, and for each world, it can be linked to multiple campaigns.  This will allow for a more flexible and scalable application that can accommodate different types of campaigns and settings.
- [ ] Campaigns have to be able to be linked to multiple worlds, and worlds have to be able to be linked to multiple campaigns.  This will allow for a more flexible and scalable application that can accommodate different types of campaigns and settings. Potentially, for each campaign, it can be linked to multiple worlds, and for each world, it can be linked to multiple campaigns.  This will allow for a more flexible and scalable application that can accommodate different types of campaigns and settings.
- [ ] Document the application and its features, including installation instructions, usage guides, and API documentation.  This will allow users to easily understand how to use the application and its features, as well as provide a reference for developers who want to contribute to the project.
- [ ] Add a "help" feature for providing users with assistance and guidance on how to use the application and its features.  This will include a knowledge base, FAQs, and contact information for support.  This will allow users to easily find answers to their questions and get help when needed.
- [ ] Build an analytics feature for tracking user behavior and application usage.  This will include tracking page views, user interactions, and other relevant metrics.  This will allow developers to understand how users are using the application and identify areas for improvement.
- [ ] Add a "notifications" feature for providing users with alerts and updates on relevant events and activities within the application.  This will include in-app notifications, email notifications, and push notifications.  This will allow users to stay informed about important events and activities within the application.
- [ ] Add a "search" feature for allowing users to search for specific entities (characters, locations, quests, items, session notes, etc.) within the application.  This will include search filters and sorting options to help users find what they are looking for quickly and easily.
- [ ] Add a "tags" feature for allowing users to categorize and organize entities (characters, locations, quests, items, session notes, etc.) within the application.  This will include the ability to create custom tags and assign them to entities for easier organization and filtering.
- [ ] Add a "favorites" feature for allowing users to mark specific entities (characters, locations, quests, items, session notes, etc.) as favorites for quick access.  This will include the ability to view and manage favorite entities in a dedicated section of the application.
- [ ] Add a "history" feature for tracking changes and updates to entities (characters, locations, quests, items, session notes, etc.) within the application.  This will include the ability to view change history, revert changes, and track who made specific changes.
- [ ] Build a mobile-friendly version of the application for users who want to access it on their smartphones or tablets.  This will include responsive design, touch-friendly interactions, and optimized performance for mobile devices.
- [ ] Build a multi-language feature for allowing users to switch between different languages within the application.  This will include translation of the user interface, as well as support for different date and time formats, number formats, and other locale-specific settings.
- [ ] Add a "themes" feature for allowing users to customize the appearance of the application.  This will include different color schemes, font options, and layout preferences.  This will allow users to personalize their experience and make the application more visually appealing.
- [ ] Build a mobile app version of the application for users who want to access it on their smartphones or tablets.  This will include native mobile app development for iOS and Android platforms, as well as support for push notifications and offline access. Potentially, this could be built using a cross-platform framework like Flutter to reduce development time and effort.
- [ ] Implement branch protection rules for the main branch to ensure that all changes are reviewed and tested before being merged.  This will help maintain code quality and prevent bugs from being introduced into the main branch.
- [ ] Implement continuous integration and continuous deployment (CI/CD) pipelines for automated testing and deployment of the application.  This will help streamline the development process and ensure that changes are deployed quickly and reliably.
- [ ] Implement automated testing for the application, including unit tests, integration tests, and end-to-end tests.  This will help ensure that the application is functioning correctly and prevent regressions from being introduced in future updates.
- [ ] Implement code linting and formatting tools to enforce coding standards and maintain code quality.  This will help ensure that the codebase is consistent and easy to read, as well as prevent common coding errors.
- [ ] Implement a publishing process for the application, including versioning, release notes, and changelogs.  This will help users understand what changes have been made in each release and provide a reference for developers who want to contribute to the project.
- [ ] Implement automatic backups for the application data, including database backups and file backups.  This will help ensure that user data is protected and can be restored in case of data loss or corruption.
- [ ] Implement automated image publishing for the application, including building and pushing Docker images to DockerHub.  This will help streamline the deployment process and ensure that the latest version of the application is always available for users. This will also include versioning and tagging of Docker images to help users identify which version of the application they are using, and should be integrated into the CI/CD pipeline to ensure that images are built and pushed automatically whenever changes are merged into the main branch.  This will help ensure that users always have access to the latest version of the application and reduce the risk of running outdated or vulnerable versions, with versioning of the docker image being tied to the version of the application being built and pushed.  This will help ensure that users can easily identify which version of the application they are using and help developers track changes and updates to the application over time.
- [ ] Migrated from notes in this README to GitHub Projects.  This will help organize tasks, track progress, and facilitate collaboration among team members.  It will also provide a centralized location for managing project-related information and resources, as well as allow for proper targeted development.
- [ ] Build a "roadmap" feature for tracking the development progress and future plans for the application.  This will include a visual representation of the development timeline, as well as a list of planned features and enhancements.  This will help users understand the direction of the application and provide transparency into the development process. _maybe_
- [ ] Implement linking from application pages to the relevant documentation pages for each feature.
- [ ] Look into tabbed options for the main navigation to allow for more features to be added without cluttering the navigation bar.  This will help improve the user experience and make it easier for users to find and access the features they need.
- [ ] Look into tabbed options in documentation to allow for more features to be added without cluttering the documentation pages.  This will help improve the user experience and make it easier for users to find and access the information they need. 
	- [ ] MKDocs had something like this, but I need to look into how to implement it in Zensical.  This will help improve the organization and presentation of the documentation, making it easier for users to navigate and find the information they need. It allowed for tabs that had the same name to be automatically selected, so if you selected a tab in one page, it would automatically select the same tab in another page.  This will help improve the user experience and make it easier for users to navigate between related pages in the documentation (especially for things like instructions that are based on the same feature, but have different instructions for different platforms or environments).  This will help improve the usability and accessibility of the documentation, making it easier for users to find the information they need and follow the instructions provided.
- [ ] Write a standardized format for documentation pages to ensure consistency and clarity across all documentation.  This will help users easily understand the information presented and follow the instructions provided.  This will also help improve the overall quality of the documentation and make it easier for users to find the information they need.
- [ ] Write a template for bug reports and feature requests to ensure that all necessary information is provided and to facilitate efficient communication between users and developers.  This will help improve the quality of bug reports and feature requests, making it easier for developers to understand the issues and implement solutions.  This will also help improve the overall user experience by ensuring that users can easily report issues and request features in a clear and organized manner.
- [ ] Tidy the documentation and make it more user-friendly, including adding a table of contents, improving navigation, and providing clear instructions for installation, configuration, and usage.  This will help users easily find the information they need and follow the instructions provided, improving the overall user experience.
- [ ] Add a disclaimer to the documentation to clarify that this is a personal project and not an official product or service.  This will help manage user expectations and prevent confusion or misunderstandings about the nature of the project.
- [ ] Add a disclaimer to the documentation and README to clarify that AI-generated content may be present in the project and that it is not a substitute for professional advice or expertise.  This will help manage user expectations and prevent confusion or misunderstandings about the nature of the project.
- [ ] Switch to proper branch naming conventions (i.e. version-based) for development and feature branches.  This will help improve the organization and management of the codebase, making it easier for developers to track changes and collaborate on features.  This will also help ensure that the codebase is structured in a way that supports efficient development and deployment processes.
- [ ] Look into ways to use a local LLM (Large Language Model) to assist with development and documentation.  This will help improve the efficiency and effectiveness of the development process, as well as provide additional resources for generating documentation and other content, while keeping costs down.  This will also help ensure that the project is leveraging the latest advancements in AI technology to improve the overall quality and functionality of the application.
- [ ] Probably more I'm forgetting, but this is a start.  I will update this as I think of more features to add.