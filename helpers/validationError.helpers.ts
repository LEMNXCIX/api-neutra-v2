function validationError(errors: any) {
  const messages = Object.values(errors).map((error: any) => ({
    message: error.message,
    field: error.path,
  }));
  return messages;
}

export = validationError;
