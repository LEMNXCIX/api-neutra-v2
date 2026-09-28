import path from "node:path";
import swaggerJSDoc from "swagger-jsdoc";
import config from "@/config/index.config";

const { port } = config;
const routeExtension =
    path.extname(__filename).toLowerCase() === ".ts" ? "ts" : "js";

export const swaggerApis = [
    path.join(__dirname, `../routes/*.${routeExtension}`),
    path.join(__dirname, `../../types/*.${routeExtension}`),
];

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Neutra API Documentation",
            version: "1.0.0",
            description: "API documentation for Neutra E-commerce platform",
            contact: {
                name: "API Support",
            },
        },
        servers: [
            {
                url: `http://localhost:${port}/api`,
                description: "Development server",
            },
            {
                url: "https://neutra.ec/api",
                description: "Production server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: swaggerApis,
};

export const swaggerSpec = swaggerJSDoc(options);
