function validationError(errors: any) {
  // Guard: Mongoose validation may sometimes pass undefined here. Ensure we always return an array.
  if (!errors || typeof errors !== 'object') {
    return [{ message: String(errors || 'Validation error'), field: undefined }];
  }

  try {
    const messages = Object.values(errors).map((error: any) => ({
      message: error && error.message ? error.message : String(error),
      field: error && error.path ? error.path : undefined,
    }));
    return messages;
  } catch (e) {
    return [{ message: 'Validation failed', field: undefined }];
  }
}

export default validationError;
