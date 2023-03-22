const duplicatedError = require("./duplicatedError.helpers");
const validationError = require("./validationError.helpers");

/**
 * Manipulación de errores de la BD
 * @param {Objeto} error Error generado en Services
 * @returns Objeto con el error especifico
 */

function dbError(error) {
	if (error.code === 11000) {
		return {
			created: false,
			error: true,
			message: duplicatedError(error.keyValue),
		};
	}

	// Error en la validación de datos
	return {
		created: false,
		error: true,
		message: validationError(error.errors),
	};
}

module.exports = dbError;
