const duplicatedError = require('./duplicatedError.helpers');
const validationError = require('./validationError.helpers');

function dbError(error: any) {
  // Defensive: if error is falsy, return a generic payload
  if (!error) {
    return { created: false, error: true, message: 'Unknown database error' };
  }

  if (error.code === 11000) {
    return {
      created: false,
      error: true,
      message: duplicatedError(error.keyValue),
    };
  }

  // If validation errors are present, normalize them; otherwise return the error message
  const validation = error.errors ? validationError(error.errors) : undefined;

  return {
    created: false,
    error: true,
    message: validation || error.message || String(error),
  };
}

export = dbError;
