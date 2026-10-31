const resourceNames = [
    'users',
    'applicationsettings',
    'locations',
    'characters',
    'characterdetails',
    'reputation'
];

const fieldSchemas = {
    users: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        username: { type: 'string', nullable: true },
        password: { type: 'string', nullable: true, writeOnly: true }
    },
    applicationsettings: {
        settingName: { type: 'string' },
        settingValue: { type: 'string', nullable: true }
    },
    locations: {
        name: { type: 'string', nullable: true },
        description: { type: 'string', nullable: true },
        parentLocation: { type: 'integer', nullable: true }
    },
    characters: {
        name: { type: 'string', nullable: true },
        type: { type: 'string', nullable: true },
        role: { type: 'string', nullable: true },
        location: { type: 'integer', nullable: true }
    },
    characterdetails: {
        characterId: { type: 'integer', nullable: true },
        charisma: { type: 'integer', nullable: true },
        intelligence: { type: 'integer', nullable: true },
        wisdom: { type: 'integer', nullable: true },
        dexterity: { type: 'integer', nullable: true },
        constitution: { type: 'integer', nullable: true },
        strength: { type: 'integer', nullable: true },
        race: { type: 'string', nullable: true },
        characterClass: { type: 'string', nullable: true },
        level: { type: 'integer', nullable: true },
        alignment: { type: 'string', nullable: true }
    },
    reputation: {
        characterId: { type: 'integer', nullable: true },
        targetId: { type: 'integer', nullable: true },
        adjustment: { type: 'integer', nullable: true },
        note: { type: 'string', nullable: true }
    }
};

const errorResponse = {
    description: 'The request could not be completed.',
    content: {
        'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
        }
    }
};

function resourceSchema(resourceName) {
    return {
        type: 'object',
        properties: {
            id: { type: 'integer', readOnly: true },
            ...fieldSchemas[resourceName]
        }
    };
}

function resourceRequestSchema(resourceName) {
    return {
        type: 'object',
        properties: fieldSchemas[resourceName]
    };
}

function resourcePaths(resourceName) {
    const requestBody = {
        required: true,
        content: {
            'application/json': {
                schema: { $ref: `#/components/schemas/${resourceName}Input` }
            }
        }
    };

    return {
        [`/api/${resourceName}`]: {
            get: {
                summary: `List ${resourceName}`,
                operationId: `list${resourceName}`,
                tags: [resourceName],
                responses: {
                    200: {
                        description: 'Records returned successfully.',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: { $ref: `#/components/schemas/${resourceName}` }
                                }
                            }
                        }
                    },
                    404: errorResponse,
                    500: errorResponse
                }
            },
            post: {
                summary: `Create a ${resourceName} record`,
                operationId: `create${resourceName}`,
                tags: [resourceName],
                requestBody,
                responses: {
                    201: {
                        description: 'Record created successfully.',
                        content: {
                            'application/json': {
                                schema: { $ref: `#/components/schemas/${resourceName}` }
                            }
                        }
                    },
                    400: errorResponse,
                    404: errorResponse
                }
            }
        },
        [`/api/${resourceName}/{id}`]: {
            parameters: [{
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'integer', minimum: 1 }
            }],
            put: {
                summary: `Update a ${resourceName} record`,
                operationId: `update${resourceName}`,
                tags: [resourceName],
                requestBody,
                responses: {
                    200: {
                        description: 'Record updated successfully.',
                        content: {
                            'application/json': {
                                schema: { $ref: `#/components/schemas/${resourceName}` }
                            }
                        }
                    },
                    400: errorResponse,
                    404: errorResponse
                }
            },
            delete: {
                summary: `Delete a ${resourceName} record`,
                operationId: `delete${resourceName}`,
                tags: [resourceName],
                responses: {
                    204: { description: 'Record deleted successfully.' },
                    400: errorResponse,
                    404: errorResponse
                }
            }
        }
    };
}

const authPaths = {
    '/api/auth/login': {
        post: {
            summary: 'Sign in',
            operationId: 'login',
            tags: ['authentication'],
            security: [],
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/LoginRequest' }
                    }
                }
            },
            responses: {
                200: {
                    description: 'Authenticated successfully.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } }
                },
                400: errorResponse,
                401: errorResponse
            }
        }
    },
    '/api/auth/me': {
        get: {
            summary: 'Get the current user',
            operationId: 'currentUser',
            tags: ['authentication'],
            responses: {
                200: {
                    description: 'Current authenticated user.',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } }
                },
                401: errorResponse
            }
        }
    },
    '/api/auth/logout': {
        post: {
            summary: 'Sign out',
            operationId: 'logout',
            tags: ['authentication'],
            responses: { 204: { description: 'Signed out successfully.' } }
        }
    }
};

const paths = resourceNames.reduce((allPaths, resourceName) => ({
    ...allPaths,
    ...resourcePaths(resourceName)
}), authPaths);

const schemas = {
    Error: {
        type: 'object',
        required: ['error'],
        properties: { error: { type: 'string' } }
    },
    LoginRequest: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
            identifier: { type: 'string', description: 'User email or username.' },
            password: { type: 'string', format: 'password' }
        }
    },
    LoginResponse: {
        type: 'object',
        properties: { user: { $ref: '#/components/schemas/users' } }
    }
};

resourceNames.forEach((resourceName) => {
    schemas[resourceName] = resourceSchema(resourceName);
    schemas[`${resourceName}Input`] = resourceRequestSchema(resourceName);
});

function createOpenApiDocument(basePath) {
    return {
        openapi: '3.0.3',
        info: {
            title: 'WorldBuilder API',
            version: '1.0.0',
            description: 'Express API for managing WorldBuilder database records.'
        },
        servers: [{ url: basePath || '/', description: 'Current application server' }],
        security: [{ cookieSession: [] }],
        tags: [{ name: 'authentication' }, ...resourceNames.map((name) => ({ name }))],
        paths,
        components: {
            schemas,
            securitySchemes: {
                cookieSession: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'worldbuilder.session'
                }
            }
        }
    };
}

module.exports = { createOpenApiDocument };
