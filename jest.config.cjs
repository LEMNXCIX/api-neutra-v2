module.exports = {
    testEnvironment: "node",
    rootDir: __dirname,
    testMatch: ["**/test/**/*.test.ts", "**/test/**/*.test.js"],
    // Unit/architecture suites use jest.unit.config.cjs (no DB bootstrap)
    testPathIgnorePatterns: [
        "/node_modules/",
        "/test/unit/",
        "/test/architecture/",
    ],
    modulePathIgnorePatterns: ["<rootDir>/dist/"],
    transform: {
        "^.+\\.tsx?$": [
            "@swc/jest",
            {
                jsc: {
                    parser: {
                        syntax: "typescript",
                        decorators: true,
                    },
                    target: "es2020",
                    transform: {
                        legacyDecorator: true,
                    },
                },
                module: {
                    type: "commonjs",
                },
            },
        ],
    },
    setupFilesAfterEnv: ["<rootDir>/test/jest.setup.ts"],
    testTimeout: 20000,
    moduleFileExtensions: ["ts", "js", "json", "node"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
        "^@scalar/express-api-reference$":
            "<rootDir>/test/mocks/scalar.mock.ts",
        "^swagger-jsdoc$": "<rootDir>/test/mocks/swagger-jsdoc.mock.ts",
        "^redis$": "<rootDir>/test/mocks/redis.mock.ts",
        "^bullmq$": "<rootDir>/test/mocks/bullmq.mock.ts",
    },
    transformIgnorePatterns: ["node_modules/(?!(@scalar|uuid)/)"],
};
