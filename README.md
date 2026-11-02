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
(This list needs moving to issues)
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
- [ ] Look into tabbed options in documentation to allow for more features to be added without cluttering the documentation pages.  This will help improve the user experience and make it easier for users to find and access the information they need. 
	- [ ] MKDocs had something like this, but I need to look into how to implement it in Zensical.  This will help improve the organization and presentation of the documentation, making it easier for users to navigate and find the information they need. It allowed for tabs that had the same name to be automatically selected, so if you selected a tab in one page, it would automatically select the same tab in another page.  This will help improve the user experience and make it easier for users to navigate between related pages in the documentation (especially for things like instructions that are based on the same feature, but have different instructions for different platforms or environments).  This will help improve the usability and accessibility of the documentation, making it easier for users to find the information they need and follow the instructions provided.
- [ ] Add auto-calculated fields for character stats, including health, mana, stamina, and other relevant attributes.
	- [ ] Include modifiers for character rolls based on their stats.
