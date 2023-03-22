const express = require("express");
const authValidation = require("../middleware/auth.middleware");
const Slideshow = require("../models/slideshow.model.js");

//Crear el contenido del slide
function slide(app) {
	const router = express.Router();
	app.use("/api/slide", router);

	router.post("/", authValidation(2), async (req, res) => {
		const newSlide = new Slideshow(req.body);
		try {
			const savedSlide = await newSlide.save();
			res.status(200).json(savedSlide);
		} catch (error) {
			res.status(500).json({
				mensaje: "Ha ocurrido un error al crear el Slide",
				error: error,
			});
		}
	});

	//Actualizar el contenido de cada Slide

	router.put("/:id", authValidation(2), async (req, res) => {
		try {
			const updateSlide = await Slideshow.findByIdAndUpdate(
				req.params.id,
				{
					$set: req.body,
				},
				{ new: true }
			);
			res.status(200).json(updateSlide);
		} catch (error) {
			res.status(500).json(error);
		}
	});

	//"Mostrar" los Slides
	router.get("/", async (req, res) => {
		try {
			const getSlide = await Slideshow.find();
			res.status(200).json(getSlide);
		} catch (error) {
			res.status(500).json(
				"Ha ocurrido un error al obtener Slides"
			);
		}
	});

	//Eliminar un Slide
	router.delete("/:id", authValidation(2), async (req, res) => {
		try {
			await Slideshow.findOneAndDelete(req.params.id);
			res.status(200).json("El producto ha sido eliminado");
		} catch (error) {
			res.status(500).json(
				"Ha ocurrido un error al eliminar el Slide"
			);
		}
	});
}
module.exports = slide;
