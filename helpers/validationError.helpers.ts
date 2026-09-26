interface NormalizedValidationError {
  // Both come straight from the validator's own bag, so the server does not
  // assert a shape it never checked.
  message: unknown;
  field: unknown;
}

function validationError(errors: unknown): NormalizedValidationError[] {
  // Guard: Mongoose validation may sometimes pass undefined here. Ensure we always return an array.
  if (!errors || typeof errors !== 'object') {
    return [{ message: String(errors || 'Validation error'), field: undefined }];
  }

  try {
    // A validator issue is `{ message?, path? }`; the bag itself is keyed by
    // field name, so object entries are what gets mapped here.
    const entries = errors as Record<string, unknown>;
    const messages = Object.values(entries).map((error: unknown) => {
      const issue =
        typeof error === 'object' && error !== null
          ? (error as { message?: unknown; path?: unknown })
          : null;

      return {
        message: issue && issue.message ? issue.message : String(error),
        field: issue && issue.path ? issue.path : undefined,
      };
    });
    return messages;
  } catch (e) {
    return [{ message: 'Validation failed', field: undefined }];
  }
}

export default validationError;
