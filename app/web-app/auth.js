const crypto = require('node:crypto');

const algorithm = 'scrypt';
const cost = 16384;
const blockSize = 8;
const parallelization = 1;
const keyLength = 64;

function deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, keyLength, {
            N: cost,
            r: blockSize,
            p: parallelization
        }, (error, derivedKey) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(derivedKey);
        });
    });
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = await deriveKey(password, salt);
    return `${algorithm}$${cost}$${blockSize}$${parallelization}$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedPassword) {
    if (!storedPassword) {
        return { valid: false, needsUpgrade: false };
    }

    if (!storedPassword.startsWith(`${algorithm}$`)) {
        const passwordBuffer = Buffer.from(password);
        const storedPasswordBuffer = Buffer.from(storedPassword);
        return {
            valid: passwordBuffer.length === storedPasswordBuffer.length
                && crypto.timingSafeEqual(passwordBuffer, storedPasswordBuffer),
            needsUpgrade: true
        };
    }

    const [storedAlgorithm, storedCost, storedBlockSize, storedParallelization, salt, storedHash] = storedPassword.split('$');
    if (storedAlgorithm !== algorithm || !salt || !storedHash) {
        return { valid: false, needsUpgrade: false };
    }

    const derivedKey = await new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, Buffer.from(storedHash, 'hex').length, {
            N: Number(storedCost),
            r: Number(storedBlockSize),
            p: Number(storedParallelization)
        }, (error, key) => error ? reject(error) : resolve(key));
    });

    return {
        valid: crypto.timingSafeEqual(derivedKey, Buffer.from(storedHash, 'hex')),
        needsUpgrade: false
    };
}

function publicUser(user) {
    if (!user) {
        return null;
    }

    const { password, ...safeUser } = user;
    return safeUser;
}

module.exports = { hashPassword, verifyPassword, publicUser };
