/**
 * Validar los datos
 * @param {Objeto} errors Error de la BD 
 * @returns Mensaje que no se ha podido validar los datos
 */
function validationError(errors) {
  const messages = Object.values(errors).map((error) => ({
    message: error.message,
    field: error.path,
  }));
  return messages;
}

module.exports = validationError;
