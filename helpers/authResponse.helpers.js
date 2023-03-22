const { production } = require("../config/index.config");

/**
 * Crea la cookie e inserta el token dentro de ella
 * @param {res} res
 * @param {result} result
 * @param {string} statusCode
 * @returns Cookie con expiración de 7 días
 */
function authResponse(res, result, statusCode) {
	if (result.success) {
		const { token, ...data } = result;
		res.cookie("token", token, {
			//httpOnly: true,
			// secure: production, //Solo disponible a través de https*
			//sameSite: "none",
			// expires: new Date(new Date().setDate(new Date().getDate() + 7)),
		}).json(data);
		return res;
	}

	return res.status(statusCode).json(result);
}

function providerResponse(res, result, statusCode) {
	if (result.success) {
		const { token, ...data } = result;

		return res
			.cookie("token", token, {
				httpOnly: true,
				secure: production, //! Solo disponible a través de https*
				sameSite: "none",
				expires: new Date(
					new Date().setDate(
						new Date().getDate() + 7
					)
				),
			})
			.redirect("http://localhost:3000");
	}

	return res.status(statusCode).json(result);
}
/**
 * Borrar el token de la cookie para cerrar session
 * @param {response} res Respuesta HTTP
 * @returns Un mensaje success true
 */
function deleteCookie(res) {
	return res
		.cookie("token", "", {
			//Es vacío para quitar el token de la cookie
			expires: new Date(),
			httpOnly: true,
			sameSite: "none",
			secure: production,
		})
		.json({
			success: true,
			message: "Se ha cerrado sesión correctamente",
		});
}
module.exports = { authResponse, deleteCookie, providerResponse };
