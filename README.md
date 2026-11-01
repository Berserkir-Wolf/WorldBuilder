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
- [ ] Probably more I'm forgetting, but this is a start.  I will update this as I think of more features to add.