"use strict";
const duplicatedError = require('./duplicatedError.helpers');
const validationError = require('./validationError.helpers');
function dbError(error) {
    if (error.code === 11000) {
        return {
            created: false,
            error: true,
            message: duplicatedError(error.keyValue),
        };
    }
    return {
        created: false,
        error: true,
        message: validationError(error.errors),
    };
}
module.exports = dbError;
