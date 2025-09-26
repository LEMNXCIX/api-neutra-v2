"use strict";
function isEmptyObject(value) {
    return value && Object.keys(value).length === 0 && value.constructor === Object;
}
module.exports = { isEmptyObject };
