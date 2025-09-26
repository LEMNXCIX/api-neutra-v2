"use strict";
function validationError(errors) {
    const messages = Object.values(errors).map((error) => ({
        message: error.message,
        field: error.path,
    }));
    return messages;
}
module.exports = validationError;
