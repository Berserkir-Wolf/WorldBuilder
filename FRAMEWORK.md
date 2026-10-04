# Framework Design

The application is intended to run a local web server, with reverse proxy support, to serve a web frontend with an SQL backend.  

## SQL

The SQL interface will be routed through SQLAlchemy (or similar abstraction layer) to allow for use of either SQLite, MySQL, or MariaDB, with SQLite being the default for quick deployments.
It will require a build framework for initial deployment, coupled with a migration structure for any SQL changes after the fact (new features, adjustments to tables, etc).  
This will need to handle data retention, to account for upgrades to an actively deployed instance.

## Auth

There will be an authentication system in play, to allow for adding/removing/managing content.  
It needs to allow for tagging of content, so that some content is simply available without authentication while other content is only available when logged in as the DM.

## API

Ideally, the SQL commands should be handled by an authenticated API.  Current thinking is to make use of the "Swagger" API tool, as it allows for clear documentation of an API.  

## Documentation

The documentation for the system will likely be built using MKDocs, on-the-fly.  
This is to ensure that any time a push to master with new features occurs, the docs for said feature auto-deploy to the docs for the system ready to go.  

## Deployment

The application will be built to deploy using docker, as this will allow for environment labels to be used for basic configuration.  
Intended supported labels (at least to start) are: baseurl, sql_type, sql_host, sql_port, sql_user, sql_pass, sql_database.
