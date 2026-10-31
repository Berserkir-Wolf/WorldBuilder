const session = require('express-session');

class PrismaSessionStore extends session.Store {
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }

    createSessionData(record) {
        return {
            cookie: {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                secure: false,
                expires: record.expiresAt,
                originalMaxAge: Math.max(record.expiresAt.getTime() - Date.now(), 0)
            },
            userId: record.userId
        };
    }

    async get(sessionId, callback) {
        try {
            const record = await this.prisma.session.findUnique({ where: { id: sessionId } });
            if (!record || record.expiresAt <= new Date()) {
                if (record) await this.destroy(sessionId, () => {});
                callback(null, null);
                return;
            }
            callback(null, this.createSessionData(record));
        } catch (error) {
            callback(error);
        }
    }

    async set(sessionId, sessionData, callback) {
        try {
            const expiresAt = sessionData.cookie?.expires
                ? new Date(sessionData.cookie.expires)
                : new Date(Date.now() + (sessionData.cookie?.maxAge || 86400000));
            await this.prisma.session.upsert({
                where: { id: sessionId },
                update: { userId: sessionData.userId, expiresAt },
                create: { id: sessionId, userId: sessionData.userId, expiresAt }
            });
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    async destroy(sessionId, callback) {
        try {
            await this.prisma.session.deleteMany({ where: { id: sessionId } });
            callback(null);
        } catch (error) {
            callback(error);
        }
    }

    async touch(sessionId, sessionData, callback) {
        try {
            const expiresAt = new Date(Date.now() + (sessionData.cookie?.maxAge || 86400000));
            await this.prisma.session.updateMany({ where: { id: sessionId }, data: { expiresAt } });
            callback(null);
        } catch (error) {
            callback(error);
        }
    }
}

module.exports = PrismaSessionStore;
