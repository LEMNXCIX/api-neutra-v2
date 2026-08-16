const path = require("path");

const tsJest = require.resolve("ts-jest");

/** Unit/architecture tests only — no DB, Redis, or app bootstrap */
module.exports = {
    testEnvironment: "node",
    rootDir: __dirname,
    testMatch: [
        "<rootDir>/test/unit/**/*.test.ts",
        "<rootDir>/test/architecture/**/*.test.ts",
    ],
    modulePathIgnorePatterns: ["<rootDir>/dist/"],
    transform: {
        "^.+\\.tsx?$": [
            tsJest,
            {
                tsconfig: path.join(__dirname, "tsconfig.json"),
                diagnostics: false,
            },
        ],
    },
    testTimeout: 15000,
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
