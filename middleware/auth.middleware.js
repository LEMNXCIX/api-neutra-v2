const { Cookie } = require("express-session");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/index.config");

/**
 * Función que permite validar el rol del usuario
 * @param {int} role Valor entero del rol 1 Usuario común, 2 Admin
 * @returns Permite continuar con la función, o envia un mensaje de permisos insuficientes
 */
function authValidation(role) {
	return (req, res, next) => {
		req.neededRole = role;
		return validateToken(req, res, next);
	};
}
/**
 *  Función que permite validar la existencia del TOKEN
 * @param {Object} req Request de la petición
 * @param {Object} res Response del proceso
 * @param {Function} next Función  que permite saltar 
 * @returns 
 */
function validateToken(req, res, next) {
	const token = req.cookies.token;

	if (!token) {
		return res.status(403).json({
			success: false,
			message: "Se requiere de un token para este proceso",
		});
	}
	return verifyToken(token, req, res, next);
}
/**
 * Función que verifica el Token
 * @param {Cookie} token Token que se encuentra en la cookie
 * @param {Request} req 
 * @param {Response} res 
 * @param {*} next 
 * @returns 
 */
function verifyToken(token, req, res, next) {
	try {
		const decoded = jwt.verify(token, jwtSecret);
		delete decoded.iat;
		delete decoded.exp;
		req.user = decoded;

		return validateRole(req, res, next);
	} catch ({ message, name }) {
		return res.status(403).json({
			success: false,
			message,
			type: name,
		});
	}
}
/**
 * Función que permite validar el rol del usuario
 * @param {Request} req 
 * @param {Response} res 
 * @param {Function} next 
 * @returns 
 */
function validateRole(req, res, next) {
	if (req.user.role >= req.neededRole) {
		return next();
	}

	return res.status(403).json({
		success: false,
		messages: "Permisos insuficientes. Necesitas un rol mayor",
	});
}

module.exports = authValidation;
