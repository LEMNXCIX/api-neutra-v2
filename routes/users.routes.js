const express = require("express");
const authValidation = require("../middleware/auth.middleware");
const UserService = require("../services/users.services");
/**
 * Rutas para los usuarios ()
 * @param {*} app
 */
function users(app) {
	const userServ = new UserService();
	const router = express.Router();
	app.use("/api/users", router);

	//
	router.get("/", authValidation(2), async (req, res) => {
		const users = await userServ.getAll();
		//return users
		return res.status(users.error ? 400 : 200).json(users);
	});
	router.get("/find/:id", authValidation(2), async (req, res) => {
		const users = await userServ.getById(req.params.id);
		return res.status(users.error ? 400 : 200).json(users);
	});
}

module.exports = users;
