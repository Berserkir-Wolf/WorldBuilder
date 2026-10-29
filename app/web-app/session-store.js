const session = require('express-session');

class PrismaSessionStore extends session.Store {
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }

    async get(sessionId, callback) {
        try {
            const record = await this.prisma.session.findUnique({ where: { id: sessionId } });
            if (!record || record.expiresAt <= new Date()) {
                if (record) await this.destroy(sessionId, () => {});
                callback(null, null);
                return;
            }
            callback(null, { userId: record.userId });
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
