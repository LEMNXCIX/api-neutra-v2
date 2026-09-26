// Prisma/Mongo duplicate-key errors carry the offending columns in `keyValue`
// (e.g. `{ email: 'a@b.c' }`). It arrives untyped, so narrow to the key/value
// bag this function actually reads.
function duplicatedError(error: unknown) {
  const keyValue =
    typeof error === 'object' && error !== null && !Array.isArray(error)
      ? (error as Record<string, unknown>)
      : {};

  const errors = Object.keys(keyValue).map((field) => ({
    message: `El ${field} '${keyValue[field]}' ya esta en uso`,
    field,
  }));

  return errors;
}

export default duplicatedError;
