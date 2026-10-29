const express = require('express');

if (!process.env.DATABASE_URL && (process.env.DATABASE_PROVIDER || 'sqlite') === 'sqlite') {
    process.env.DATABASE_URL = 'file:/app/data/worldbuilder.db';
}

const { PrismaClient } = require('@prisma/client');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const { createOpenApiDocument } = require('./openapi');

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
const openApiDocument = createOpenApiDocument(basePath);

app.use(express.json());

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

function getPayload(resource, body) {
    return Object.fromEntries(
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
}

apiRouter.get('/:resource', async (req, res) => {
    const resource = getResource(req.params.resource);
    if (!resource) {
        return res.status(404).json({ error: 'Unknown resource.' });
    }

    try {
        const records = await prisma[resource.delegate].findMany({ orderBy: { id: 'asc' } });
        return res.json(records);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Database error.' });
    }
});

apiRouter.post('/:resource', async (req, res) => {
    const resource = getResource(req.params.resource);
    if (!resource) {
        return res.status(404).json({ error: 'Unknown resource.' });
    }

    try {
        const record = await prisma[resource.delegate].create({ data: getPayload(resource, req.body) });
        return res.status(201).json(record);
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }
});

apiRouter.put('/:resource/:id', async (req, res) => {
    const resource = getResource(req.params.resource);
    if (!resource) {
        return res.status(404).json({ error: 'Unknown resource.' });
    }

    try {
        const record = await prisma[resource.delegate].update({
            where: { id: getRecordId(req.params.id) },
            data: getPayload(resource, req.body)
        });
        return res.json(record);
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }
});

apiRouter.delete('/:resource/:id', async (req, res) => {
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

app.use(`${basePath}/api` || '/api', apiRouter);
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
