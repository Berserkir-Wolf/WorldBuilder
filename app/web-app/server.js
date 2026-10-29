const express = require('express');

if (!process.env.DATABASE_URL && (process.env.DATABASE_PROVIDER || 'sqlite') === 'sqlite') {
    process.env.DATABASE_URL = 'file:/app/data/worldbuilder.db';
}

const { PrismaClient } = require('@prisma/client');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const { createOpenApiDocument } = require('./openapi');
const { hashPassword, verifyPassword, publicUser } = require('./auth');
const PrismaSessionStore = require('./session-store');

const app = express();
const port = process.env.PORT || 3000;
const configuredBaseUrl = process.env.BASE_URL || '/';
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

const basePath = getBasePath(configuredBaseUrl);
const publicDirectory = path.join(__dirname, 'client', 'public');
const apiRouter = express.Router();
const authRouter = express.Router();
const adminRouter = express.Router();
const openApiDocument = createOpenApiDocument(basePath);

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
        secure: process.env.NODE_ENV === 'production',
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
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        if (verification.needsUpgrade) {
            await prisma.user.update({
                where: { id: user.id },
                data: { password: await hashPassword(password) }
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
    return res.status(201).json(publicUser(user));
});

adminRouter.put('/users/:id', async (req, res) => {
    const data = {};
    ['name', 'email', 'username', 'canWrite', 'isAdministrator', 'mustResetPassword'].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) data[field] = req.body[field];
    });
    if (req.body.password) data.password = await hashPassword(req.body.password);
    const user = await prisma.user.update({ where: { id: getRecordId(req.params.id) }, data });
    return res.json(publicUser(user));
});

adminRouter.delete('/users/:id', async (req, res) => {
    const id = getRecordId(req.params.id);
    if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
    await prisma.user.delete({ where: { id } });
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
        }

        req.session.userId = user.id;
        return res.json({ user: publicUser(user) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Authentication failed.' });
    }
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
    await prisma.user.update({
        where: { id: req.session.userId },
        data: { password: await hashPassword(password), mustResetPassword: false }
    });
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

apiRouter.get('/:resource', async (req, res) => {
    const resource = getResource(req.params.resource);
    if (!resource) {
        return res.status(404).json({ error: 'Unknown resource.' });
    }

    try {
        const records = await prisma[resource.delegate].findMany({ orderBy: { id: 'asc' } });
        return res.json(records.map((record) => serializeRecord(resource, record)));
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Database error.' });
    }
});

apiRouter.post('/:resource', requireWrite, async (req, res) => {
    const resource = getResource(req.params.resource);
    if (!resource) {
        return res.status(404).json({ error: 'Unknown resource.' });
    }

    try {
        const record = await prisma[resource.delegate].create({ data: await getPayload(resource, req.body) });
        return res.status(201).json(serializeRecord(resource, record));
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }
});

apiRouter.put('/:resource/:id', requireWrite, async (req, res) => {
    const resource = getResource(req.params.resource);
    if (!resource) {
        return res.status(404).json({ error: 'Unknown resource.' });
    }

    try {
        const record = await prisma[resource.delegate].update({
            where: { id: getRecordId(req.params.id) },
            data: await getPayload(resource, req.body)
        });
        return res.json(serializeRecord(resource, record));
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }
});

apiRouter.delete('/:resource/:id', requireWrite, async (req, res) => {
    const resource = getResource(req.params.resource);
    if (!resource) {
        return res.status(404).json({ error: 'Unknown resource.' });
    }

    try {
        await prisma[resource.delegate].delete({ where: { id: getRecordId(req.params.id) } });
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }
});

app.use(`${basePath}/api/auth`, authRouter);
app.use(`${basePath}/api/admin`, adminRouter);
app.use(`${basePath}/api`, apiRouter);
app.get(`${basePath}/api-docs/openapi.json`, (req, res) => {
    res.json(openApiDocument);
});
app.use(
    `${basePath}/api-docs`,
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
        explorer: true,
        customSiteTitle: 'WorldBuilder API documentation'
    })
);
app.get(`${basePath}/login`, (req, res) => res.sendFile(path.join(publicDirectory, 'index.html')));
app.get(`${basePath}/admin`, (req, res) => res.sendFile(path.join(publicDirectory, 'index.html')));
app.use(basePath || '/', express.static(publicDirectory));

async function start() {
    await prisma.$connect();

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

start().catch(async (error) => {
    console.error('Unable to start the application:', error);
    await prisma.$disconnect();
    process.exit(1);
});
