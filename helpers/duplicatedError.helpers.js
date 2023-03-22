/**
 * Manejar la duplicidad de datos
 * @param {Objeto} error Error si existe datos duplicados en la BD
 * @returns Objeto con el mensaje del dato que es duplicado
 */

function duplicatedError(error) {
  const errors = Object.keys(error).map((field) => ({
    message: `El ${field} '${error[field]}' ya esta en uso`,
    field
  }));

  return errors;
}

module.exports = duplicatedError;
