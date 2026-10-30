const express = require('express');

if (!process.env.DATABASE_URL && (process.env.DATABASE_PROVIDER || 'sqlite') === 'sqlite') {
    process.env.DATABASE_URL = 'file:/app/data/worldbuilder.db';
}

const { PrismaClient } = require('@prisma/client');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');
const { createOpenApiDocument } = require('./openapi');
const { hashPassword, verifyPassword, publicUser } = require('./auth');
const PrismaSessionStore = require('./session-store');
const applicationVersion = require('./package.json').version;

const app = express();
const port = process.env.PORT || 3000;
const envBaseUrl = process.env.BASE_URL;
const baseUrlLockedByEnvironment = envBaseUrl !== undefined && String(envBaseUrl).trim() !== '';
const prisma = new PrismaClient();

function getBasePath(baseUrl) {
    const value = baseUrl.trim();

    if (!value || value === '/') {
        return '';
    }

    if (/^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
        return new URL(value).pathname.replace(/\/$/, '');
    }

    const path = value.startsWith('/') ? value : `/${value}`;
    return path.replace(/\/$/, '');
}

const publicDirectory = path.join(__dirname, 'client', 'public');
const dataDirectory = process.env.DATA_DIRECTORY
    || (process.env.UPLOAD_FOLDER ? path.dirname(process.env.UPLOAD_FOLDER) : null)
    || (process.env.DATABASE_URL?.startsWith('file:') ? path.dirname(process.env.DATABASE_URL.replace(/^file:/, '')) : null)
    || '/app/data';
const logsDirectory = path.join(dataDirectory, 'logs');
const errorLogPath = path.join(logsDirectory, 'errors.log');
const activityLogPath = path.join(logsDirectory, 'activity.log');
const logRotationIntervalMs = 24 * 60 * 60 * 1000;
const lastRotationByFile = {
    [errorLogPath]: Date.now(),
    [activityLogPath]: Date.now()
};
const apiRouter = express.Router();
const authRouter = express.Router();
const adminRouter = express.Router();
let basePath = '';

function normalizeBaseUrlValue(value) {
    const normalizedPath = getBasePath(String(value || '/'));
    return normalizedPath || '/';
}

async function resolveBasePath() {
    if (baseUrlLockedByEnvironment) {
        const lockedBaseUrl = normalizeBaseUrlValue(envBaseUrl);
        await prisma.applicationSetting.upsert({
            where: { settingName: 'baseurl' },
            update: { settingValue: lockedBaseUrl },
            create: { settingName: 'baseurl', settingValue: lockedBaseUrl }
        });
        return getBasePath(lockedBaseUrl);
    }

    const baseUrlSetting = await prisma.applicationSetting.findUnique({ where: { settingName: 'baseurl' } });
    return getBasePath(baseUrlSetting?.settingValue || '/');
}

function formatDateStamp(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function rotateLogIfNeeded(logPath, now = Date.now()) {
    const lastRotationAt = lastRotationByFile[logPath] || 0;
    if (now - lastRotationAt < logRotationIntervalMs) {
        return;
    }

    lastRotationByFile[logPath] = now;

    try {
        if (!fs.existsSync(logPath)) {
            return;
        }

        const stats = fs.statSync(logPath);
        const dateStamp = formatDateStamp(stats.mtime);
        const parsed = path.parse(logPath);
        let rotatedPath = path.join(logsDirectory, `${parsed.name}-${dateStamp}${parsed.ext}`);
        let suffix = 1;

        while (fs.existsSync(rotatedPath)) {
            rotatedPath = path.join(logsDirectory, `${parsed.name}-${dateStamp}-${suffix}${parsed.ext}`);
            suffix += 1;
        }

        fs.renameSync(logPath, rotatedPath);
    } catch (error) {
        console.error('Unable to rotate log file.', error);
    }
}

function logError(message, error) {
    rotateLogIfNeeded(errorLogPath);

    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error
        ? `${error.stack || error.message}`
        : `${JSON.stringify(error)}`;
    const line = `[${timestamp}] ${message}${errorMessage ? `\n${errorMessage}` : ''}\n`;

    console.error(message, error);

    try {
        fs.mkdirSync(logsDirectory, { recursive: true });
        fs.appendFileSync(errorLogPath, line, 'utf8');
    } catch (fileError) {
        console.error('Unable to write to error log file.', fileError);
    }
}

function logActivity(message) {
    rotateLogIfNeeded(activityLogPath);

    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}`;

    console.log(line);

    try {
        fs.mkdirSync(logsDirectory, { recursive: true });
        fs.appendFileSync(activityLogPath, `${line}\n`, 'utf8');
    } catch (fileError) {
        console.error('Unable to write to activity log file.', fileError);
    }
}

function getRequestIp(req) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

function getUserLabel(user) {
    return user?.username || user?.email || `user#${user?.id ?? 'unknown'}`;
}

setInterval(() => {
    rotateLogIfNeeded(errorLogPath);
    rotateLogIfNeeded(activityLogPath);
}, logRotationIntervalMs).unref();

app.use(express.json());
app.use(session({
    name: 'worldbuilder.session',
    secret: process.env.SESSION_SECRET || 'development-only-change-me',
    store: new PrismaSessionStore(prisma),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production' ? 'auto' : false,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.warn('SESSION_SECRET is not set; configure it before using authentication in production.');
}

async function requireAuth(req, res, next) {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
    req.user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (!req.user) {
        return req.session.destroy(() => res.status(401).json({ error: 'Authentication required.' }));
    }
    if (req.user.mustResetPassword) {
        return res.status(403).json({ error: 'Password reset required.' });
    }
    return next();
}

function requireWrite(req, res, next) {
    return req.user?.canWrite
        ? next()
        : res.status(403).json({ error: 'Write access required.' });
}

function requireAdministrator(req, res, next) {
    return req.user?.isAdministrator
        ? next()
        : res.status(403).json({ error: 'Administrator access required.' });
}

function requireResourceWriteAccess(req, res, next) {
    if (req.params.resource === 'applicationsettings' || req.params.resource === 'users') {
        return requireAdministrator(req, res, next);
    }

    return requireWrite(req, res, next);
}

function requireResourceReadAccess(req, res, next) {
    if (req.params.resource === 'applicationsettings' || req.params.resource === 'users') {
        return requireAdministrator(req, res, next);
    }

    return next();
}

authRouter.post('/login', async (req, res) => {
    const identifier = String(req.body.identifier || '').trim();
    const password = String(req.body.password || '');

    if (!identifier || !password) {
        return res.status(400).json({ error: 'Identifier and password are required.' });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        });

        const verification = await verifyPassword(password, user?.password);

        if (!user || !verification.valid) {
            logActivity(`user ${identifier} failed to log in from ${getRequestIp(req)}`);
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        if (verification.needsUpgrade) {
            await prisma.user.update({
                where: { id: user.id },
                data: { password: await hashPassword(password) }
            });
        }

        req.session.userId = user.id;
        logActivity(`user ${getUserLabel(user)} logged in successfully from ${getRequestIp(req)}`);
        return res.json({ user: publicUser(user) });
    } catch (error) {
        logError('Authentication failed.', error);
        return res.status(500).json({ error: 'Authentication failed.' });
    }
});

authRouter.get('/appname', async (req, res) => {
    const setting = await prisma.applicationSetting.findUnique({ where: { settingName: 'appname' } });
    return res.json({ appName: setting?.settingValue || 'WorldBuilder' });
});

adminRouter.use(requireAuth, requireAdministrator);
adminRouter.get('/users', async (req, res) => {
    const users = await prisma.user.findMany({ orderBy: { id: 'asc' } });
    return res.json(users.map(publicUser));
});

adminRouter.post('/users', async (req, res) => {
    const { name, email, username, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                username: username || null,
                password: await hashPassword(password),
                canWrite: Boolean(req.body.canWrite),
                isAdministrator: Boolean(req.body.isAdministrator),
                mustResetPassword: Boolean(req.body.mustResetPassword)
            }
        });
        logActivity(`user ${getUserLabel(user)} created by ${getUserLabel(req.user)}`);
        return res.status(201).json(publicUser(user));
    } catch (error) {
        logError('User creation failed.', error);
        return res.status(400).json({ error: error.message });
    }
});

adminRouter.put('/users/:id', async (req, res) => {
    const data = {};
    ['name', 'email', 'username', 'canWrite', 'isAdministrator', 'mustResetPassword'].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) data[field] = req.body[field];
    });
    if (req.body.password) data.password = await hashPassword(req.body.password);

    try {
        const user = await prisma.user.update({ where: { id: getRecordId(req.params.id) }, data });
        logActivity(`user ${getUserLabel(user)} modified by ${getUserLabel(req.user)}`);
        return res.json(publicUser(user));
    } catch (error) {
        logError('User update failed.', error);
        return res.status(400).json({ error: error.message });
    }
});

adminRouter.delete('/users/:id', async (req, res) => {
    const id = getRecordId(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
    await prisma.user.delete({ where: { id } });
    logActivity(`user user#${id} deleted by ${getUserLabel(req.user)}`);
    return res.status(204).send();
});

adminRouter.get('/settings/appname', async (req, res) => {
    const setting = await prisma.applicationSetting.findUnique({ where: { settingName: 'appname' } });
    return res.json({ appName: setting?.settingValue || 'WorldBuilder' });
});

adminRouter.put('/settings/appname', async (req, res) => {
    const appName = String(req.body.appName || '').trim();
    if (!appName) return res.status(400).json({ error: 'App name is required.' });
    const setting = await prisma.applicationSetting.upsert({
        where: { settingName: 'appname' },
        update: { settingValue: appName },
        create: { settingName: 'appname', settingValue: appName }
    });
    return res.json({ appName: setting.settingValue });
});

adminRouter.get('/settings/baseurl', async (req, res) => {
    const setting = await prisma.applicationSetting.findUnique({ where: { settingName: 'baseurl' } });
    const configuredBaseUrl = setting?.settingValue || '/';
    return res.json({
        baseUrl: configuredBaseUrl,
        locked: baseUrlLockedByEnvironment,
        source: baseUrlLockedByEnvironment ? 'environment' : 'database'
    });
});

adminRouter.put('/settings/baseurl', async (req, res) => {
    if (baseUrlLockedByEnvironment) {
        return res.status(403).json({ error: 'Base URL is managed by BASE_URL environment variable.' });
    }

    const baseUrl = normalizeBaseUrlValue(req.body.baseUrl);
    const setting = await prisma.applicationSetting.upsert({
        where: { settingName: 'baseurl' },
        update: { settingValue: baseUrl },
        create: { settingName: 'baseurl', settingValue: baseUrl }
    });

    logActivity(`application setting baseurl updated to ${setting.settingValue} by ${getUserLabel(req.user)}`);
    return res.json({
        baseUrl: setting.settingValue,
        locked: false,
        source: 'database',
        requiresRestart: true
    });
});

adminRouter.get('/settings/versions', async (req, res) => {
    const [appVersionSetting, dbVersionSetting] = await Promise.all([
        prisma.applicationSetting.findUnique({ where: { settingName: 'appversion' } }),
        prisma.applicationSetting.findUnique({ where: { settingName: 'dbversion' } })
    ]);

    return res.json({
        appVersion: appVersionSetting?.settingValue || applicationVersion,
        dbVersion: dbVersionSetting?.settingValue || null
    });
});

authRouter.get('/me', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'Authentication required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ error: 'Authentication required.' });
    }

    return res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (req, res) => {
    return req.session.destroy(() => res.status(204).send());
});

authRouter.post('/reset-password', async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'Authentication required.' });
    }
    const password = String(req.body.password || '');
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
    await prisma.user.update({
        where: { id: req.session.userId },
        data: { password: await hashPassword(password), mustResetPassword: false }
    });
    logActivity(`user ${getUserLabel(user)} password changed from ${getRequestIp(req)}`);
    return res.status(204).send();
});

const resources = {
    users: {
        delegate: 'user',
        fields: {
            name: 'string',
            email: 'string',
            username: 'string',
            password: 'string'
        }
    },
    applicationsettings: {
        delegate: 'applicationSetting',
        fields: {
            settingName: 'string',
            settingValue: 'string'
        }
    },
    locations: {
        delegate: 'location',
        fields: {
            name: 'string',
            description: 'string',
            parentLocation: 'number'
        }
    },
    characters: {
        delegate: 'character',
        fields: {
            name: 'string',
            type: 'string',
            role: 'string',
            location: 'number'
        }
    },
    characterdetails: {
        delegate: 'characterDetail',
        fields: {
            characterId: 'number',
            charisma: 'number',
            intelligence: 'number',
            wisdom: 'number',
            dexterity: 'number',
            constitution: 'number',
            strength: 'number',
            race: 'string',
            characterClass: 'string',
            level: 'number',
            alignment: 'string'
        }
    },
    reputation: {
        delegate: 'reputation',
        fields: {
            characterId: 'number',
            targetId: 'number',
            adjustment: 'number',
            note: 'string'
        }
    }
};

function getResource(resourceName) {
    return resources[resourceName];
}

function getRecordId(value) {
    const id = Number(value);
    if (!Number.isInteger(id)) {
        throw new Error('Record id must be an integer.');
    }
    return id;
}

async function getPayload(resource, body) {
    const payload = Object.fromEntries(
        Object.entries(resource.fields)
            .filter(([field]) => Object.prototype.hasOwnProperty.call(body, field))
            .map(([field, type]) => {
                const value = body[field];
                if (value === '' || value === undefined) {
                    return [field, null];
                }
                if (type === 'number') {
                    const number = Number(value);
                    if (!Number.isFinite(number)) {
                        throw new Error(`${field} must be a number.`);
                    }
                    return [field, number];
                }
                return [field, value];
            })
    );

    if (resource.delegate === 'user' && Object.prototype.hasOwnProperty.call(payload, 'password') && payload.password) {
        payload.password = await hashPassword(payload.password);
    }

    return payload;
}

function serializeRecord(resource, record) {
    return resource.delegate === 'user' ? publicUser(record) : record;
}

apiRouter.use(requireAuth);

apiRouter.get('/:resource', requireResourceReadAccess, async (req, res) => {
    const resource = getResource(req.params.resource);
    if (!resource) {
        return res.status(404).json({ error: 'Unknown resource.' });
    }

    try {
        const records = await prisma[resource.delegate].findMany({ orderBy: { id: 'asc' } });
        return res.json(records.map((record) => serializeRecord(resource, record)));
    } catch (error) {
        logError('Database read failed.', error);
        return res.status(500).json({ error: 'Database error.' });
    }
});

apiRouter.post('/:resource', requireResourceWriteAccess, async (req, res) => {
    const resource = getResource(req.params.resource);
    if (!resource) {
        return res.status(404).json({ error: 'Unknown resource.' });
    }

    try {
        const record = await prisma[resource.delegate].create({ data: await getPayload(resource, req.body) });
        logActivity(`database_entry ${resource.delegate}#${record.id} created by ${getUserLabel(req.user)}`);
        return res.status(201).json(serializeRecord(resource, record));
    } catch (error) {
        logError('Database create failed.', error);
        return res.status(400).json({ error: error.message });
    }
});

apiRouter.put('/:resource/:id', requireResourceWriteAccess, async (req, res) => {
    const resource = getResource(req.params.resource);
    if (!resource) {
        return res.status(404).json({ error: 'Unknown resource.' });
    }

    try {
        const record = await prisma[resource.delegate].update({
            where: { id: getRecordId(req.params.id) },
            data: await getPayload(resource, req.body)
        });
        logActivity(`database_entry ${resource.delegate}#${record.id} modified by ${getUserLabel(req.user)}`);
        return res.json(serializeRecord(resource, record));
    } catch (error) {
        logError('Database update failed.', error);
        return res.status(400).json({ error: error.message });
    }
});

apiRouter.delete('/:resource/:id', requireResourceWriteAccess, async (req, res) => {
    const resource = getResource(req.params.resource);
    if (!resource) {
        return res.status(404).json({ error: 'Unknown resource.' });
    }

    try {
        const id = getRecordId(req.params.id);
        await prisma[resource.delegate].delete({ where: { id } });
        logActivity(`database_entry ${resource.delegate}#${id} deleted by ${getUserLabel(req.user)}`);
        return res.status(204).send();
    } catch (error) {
        logError('Database delete failed.', error);
        return res.status(400).json({ error: error.message });
    }
});

function mountApplicationRoutes(currentBasePath) {
    const openApiDocument = createOpenApiDocument(currentBasePath);

    app.use(`${currentBasePath}/api/auth`, authRouter);
    app.use(`${currentBasePath}/api/admin`, adminRouter);
    app.use(`${currentBasePath}/api`, apiRouter);
    app.get(`${currentBasePath}/api-docs/openapi.json`, (req, res) => {
        res.json(openApiDocument);
    });
    app.use(
        `${currentBasePath}/api-docs`,
        swaggerUi.serve,
        swaggerUi.setup(openApiDocument, {
            explorer: true,
            customSiteTitle: 'WorldBuilder API documentation'
        })
    );
    app.get(`${currentBasePath}/login`, (req, res) => res.sendFile(path.join(publicDirectory, 'index.html')));
    app.get(`${currentBasePath}/reset-password`, (req, res) => res.sendFile(path.join(publicDirectory, 'index.html')));
    app.get(`${currentBasePath}/edit`, (req, res) => res.sendFile(path.join(publicDirectory, 'index.html')));
    app.get(`${currentBasePath}/admin`, (req, res) => res.sendFile(path.join(publicDirectory, 'index.html')));
    app.use(currentBasePath || '/', express.static(publicDirectory));
}

async function start() {
    await prisma.$connect();

    basePath = await resolveBasePath();
    mountApplicationRoutes(basePath);

    const server = app.listen(port, () => {
        console.log(`Web application running on port ${port}${basePath || '/'}`);
    });

    const shutdown = async () => {
        server.close(async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

process.on('uncaughtException', (error) => {
    logError('Uncaught exception.', error);
});

process.on('unhandledRejection', (reason) => {
    logError('Unhandled rejection.', reason);
});

start().catch(async (error) => {
    logError('Unable to start the application.', error);
    await prisma.$disconnect();
    process.exit(1);
});
