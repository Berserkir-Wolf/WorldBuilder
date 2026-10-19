const express = require('express');
const { PrismaClient } = require('@prisma/client');

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
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { id: 'asc' }
        });

        res.json({
            message: 'Hello from the WorldBuilder API!',
            baseUrl: configuredBaseUrl,
            users
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Database error.');
    }
});

app.use(basePath || '/', router);

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
