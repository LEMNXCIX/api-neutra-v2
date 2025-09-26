import { Application, Request, Response } from 'express';
const authValidation = require('../middleware/auth.middleware');
const Slideshow = require('../models/slideshow.model');

function slide(app: Application) {
  const router = require('express').Router();
  app.use('/api/slide', router);

  router.post('/', authValidation(2), async (req: Request, res: Response) => {
    const newSlide = new Slideshow((req as any).body);
    try {
      const savedSlide = await newSlide.save();
      res.status(200).json(savedSlide);
    } catch (error) {
      res.status(500).json({
        mensaje: 'Ha ocurrido un error al crear el Slide',
        error: error,
      });
    }
  });

  router.put('/:id', authValidation(2), async (req: Request, res: Response) => {
    try {
      const updateSlide = await Slideshow.findByIdAndUpdate(
        (req.params as any).id,
        { $set: (req as any).body },
        { new: true }
      );
      res.status(200).json(updateSlide);
    } catch (error) {
      res.status(500).json(error);
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const getSlide = await Slideshow.find();
      res.status(200).json(getSlide);
    } catch (error) {
      res.status(500).json('Ha ocurrido un error al obtener Slides');
    }
  });

  router.delete('/:id', authValidation(2), async (req: Request, res: Response) => {
    try {
      await Slideshow.findOneAndDelete((req.params as any).id);
      res.status(200).json('El producto ha sido eliminado');
    } catch (error) {
      res.status(500).json('Ha ocurrido un error al eliminar el Slide');
    }
  });
}

export = slide;
