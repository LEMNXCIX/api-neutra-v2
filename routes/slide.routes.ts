import { Application, Request, Response, Router } from 'express';
import authValidation from '../middleware/auth.middleware';
import Slideshow from '../models/slideshow.model';

function slide(app: Application) {
  const router = Router();
  app.use('/api/slide', router);

  router.post('/', authValidation(2), async (req: Request, res: Response) => {
    const newSlide = new Slideshow((req as any).body);
    try {
      const savedSlide = await newSlide.save();
      return res.apiSuccess(savedSlide, 'Slide creado', 200);
    } catch (error) {
      return res.apiError(error, 'Ha ocurrido un error al crear el Slide', 500);
    }
  });

  router.put('/:id', authValidation(2), async (req: Request, res: Response) => {
    try {
      const updateSlide = await Slideshow.findByIdAndUpdate(
        (req.params as any).id,
        { $set: (req as any).body },
        { new: true }
      );
      return res.apiSuccess(updateSlide, 'Slide actualizado', 200);
    } catch (error) {
      return res.apiError(error, 'Error al actualizar el Slide', 500);
    }
  });

  router.get('/', async (req: Request, res: Response) => {
    try {
      const getSlide = await Slideshow.find();
      return res.apiSuccess(getSlide, '', 200);
    } catch (error) {
      return res.apiError(error, 'Ha ocurrido un error al obtener Slides', 500);
    }
  });

  router.delete('/:id', authValidation(2), async (req: Request, res: Response) => {
    try {
      await Slideshow.findOneAndDelete((req.params as any).id);
      return res.apiSuccess(undefined, 'El producto ha sido eliminado', 200);
    } catch (error) {
      return res.apiError(error, 'Ha ocurrido un error al eliminar el Slide', 500);
    }
  });
}

export default slide;
