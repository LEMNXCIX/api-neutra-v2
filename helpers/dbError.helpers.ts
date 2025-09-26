const duplicatedError = require('./duplicatedError.helpers');
const validationError = require('./validationError.helpers');

function dbError(error: any) {
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

export = dbError;
