function duplicatedError(error: any) {
  const errors = Object.keys(error).map((field) => ({
    message: `El ${field} '${error[field]}' ya esta en uso`,
    field,
  }));

  return errors;
}

export = duplicatedError;
