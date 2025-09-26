"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const mongoose_1 = __importDefault(require("mongoose"));
const { dbUsername, dbPassword, dbHost, dbName } = require('./index.config');
const connection = async function () {
    const conn = await mongoose_1.default.connect(`mongodb+srv://${dbUsername}:${dbPassword}@${dbHost}/${dbName}?retryWrites=true&w=majority`);
    // console.log('Usando: ' + conn.connection.host);
};
module.exports = { connection, mongoose: mongoose_1.default };
