import duplicatedError from '@/helpers/duplicatedError.helpers';
import validationError from '@/helpers/validationError.helpers';

// The only error fields this handler reads. Kept structural on purpose: the
// driver-specific error classes are not reachable from every layer, and typing
// against `Prisma.PrismaClientKnownRequestError` would make the `code` check
// below a compile error (its `code` is a `string`, this compares a number).
interface DatabaseErrorLike {
  code?: unknown;
  keyValue?: unknown;
  errors?: unknown;
  message?: unknown;
}

function isDatabaseErrorLike(error: unknown): error is DatabaseErrorLike {
  return typeof error === 'object' && error !== null;
}

function dbError(error: unknown) {
  // Defensive: if error is falsy, return a generic payload
  if (!error) {
    return { created: false, error: true, message: 'Unknown database error' };
  }

  // Primitives carry none of the fields below; reading them off `{}` keeps the
  // original fall-through to `String(error)`.
  const dbErrorLike: DatabaseErrorLike = isDatabaseErrorLike(error)
    ? error
    : {};

  if (dbErrorLike.code === 11000) {
    return {
      created: false,
      error: true,
      message: duplicatedError(dbErrorLike.keyValue),
    };
  }

  // If validation errors are present, normalize them; otherwise return the error message
  const validation = dbErrorLike.errors
    ? validationError(dbErrorLike.errors)
    : undefined;

  return {
    created: false,
    error: true,
    message: validation || dbErrorLike.message || String(error),
  };
}

export default dbError;
