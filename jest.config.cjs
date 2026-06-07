module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/test/**/*.test.ts", "**/test/**/*.test.js"],
    modulePathIgnorePatterns: ["<rootDir>/dist/"],
    transform: {
        "^.+\\.ts$": "ts-jest",
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
