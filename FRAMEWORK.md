# Framework Design

The application is intended to run a local web server, with reverse proxy support, to serve a web frontend with an SQL backend.  

The SQL interface will be routed through SQLAlchemy (or similar abstraction layer) to allow for use of either SQLite, MySQL, or MariaDB, with SQLite being the default for quick deployments.
There will also be an authentication system in play, to allow for adding/removing/managing content.