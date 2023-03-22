const express = require("express");
const passport = require("passport");
const {
	authResponse,
	providerResponse,
	deleteCookie,
} = require("../helpers/authResponse.helpers");
const AuthService = require("../services/auth.services");
const authValidation = require("../middleware/auth.middleware");

/**
 * Routas de las peticiones de Login y Signup
 * @param {funcion} app express()
 */

function auth(app) {
	const router = express.Router();

	app.use("/api/auth", router);

	const authServ = new AuthService();

	//Ruta para iniciar sesion
	router.post("/login", async (req, res) => {
		const result = await authServ.login(req.body);
		return authResponse(res, result, 401);
	});

	//Ruta para registro
	router.post("/signup", async (req, res) => {
		const result = await authServ.signup(req.body);
		return authResponse(res, result, 200);
	});

	//Ruta del loguot que elimina la cookie
	router.get("/logout", (req, res) => {
		return deleteCookie(res);
	});

	router.get("/validate", authValidation(1), (req, res) => {
		return res.json({ success: true, user: req.user });
	});

	//Login SigUp Google
	router.get(
		"/google",
		passport.authenticate("google", { scope: ["email", "profile"] })
	);
	router.get(
		"/google/callback",
		passport.authenticate("google", { session: false }),
		async (req, res) => {
			const user = req.user.profile;
			const result = await authServ.socialLogin(user);
			return providerResponse(res, result, 401);
		}
	);

	//Login SignUp Facebook
	router.get(
		"/facebook",
		passport.authenticate("facebook", { scope: ["email"] })
	);
	router.get(
		"/facebook/callback",
		passport.authenticate("facebook", { session: false }),
		async (req, res) => {
			const user = req.user.profile;
			const result = await authServ.socialLogin(user);
			return providerResponse(res, result, 401);
		}
	);

	//TWITTER
	router.get("/twitter", passport.authenticate("twitter"));
	router.get(
		"/twitter/callback",
		passport.authenticate("twitter", { scope: ["email"] }),
		async (req, res) => {
			const user = req.user.profile;
			const result = await authServ.socialLogin(user);
			return providerResponse(res, result, 401);
		}
	);

	//GITHUB
	router.get(
		"/github",
		passport.authenticate("github", { scope: ["user:email"] })
	);
	router.get(
		"/github/callback",
		passport.authenticate("github", { session: false }),
		async (req, res) => {
			const user = req.user.profile;
			const result = await authServ.socialLogin(user);
			return providerResponse(res, result, 401);
		}
	);
}

module.exports = auth;
