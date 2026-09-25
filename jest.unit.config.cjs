/** Unit and architecture tests only; no database, Redis, or app bootstrap. */
const typescriptTransform = "^.+\\.tsx?$";
const javascriptTransform = "^.+\\.[cm]?js$";

module.exports = {
    testEnvironment: "node",
    rootDir: __dirname,
    testMatch: [
        "<rootDir>/test/unit/**/*.test.ts",
        "<rootDir>/test/architecture/**/*.test.ts",
    ],
    modulePathIgnorePatterns: ["<rootDir>/dist/"],
    transform: {
        [typescriptTransform]: [
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
        [javascriptTransform]: [
            "@swc/jest",
            {
                jsc: {
                    parser: {
                        syntax: "ecmascript",
                    },
                    target: "es2020",
                },
                module: {
                    type: "commonjs",
                },
            },
        ],
    },
    testTimeout: 20000,
    moduleFileExtensions: ["ts", "js", "mjs", "cjs", "json", "node"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
        "^@scalar/express-api-reference$":
            "<rootDir>/test/mocks/scalar.mock.ts",
        "^swagger-jsdoc$": "<rootDir>/test/mocks/swagger-jsdoc.mock.ts",
        "^redis$": "<rootDir>/test/mocks/redis.mock.ts",
        "^bullmq$": "<rootDir>/test/mocks/bullmq.mock.ts",
    },
    transformIgnorePatterns: ["node_modules/(?!uuid/)"],
};
