const express = require("express");
const CartService = require("../services/cart.services");
const authMiddleware = require("../middleware/auth.middleware");

/**
 * Todas las rutas del carrito
 * @param {*} app Express
 */
function cart(app) {
  const router = express.Router();
  const cartServ = new CartService();

  app.use("/api/cart", router);
  //Middeware
  app.use((req, res)=>{
    authMiddleware(1)
    console.log('validacion de tokens')
    next()
  })
  //Obtener los productos del carrito
  router.get("/", authMiddleware(1), async (req, res) => {
    const result = await cartServ.getItems(req.user.id);
    return res.status(result.error ? 400 : 200).json(result);
  });

  //Añadir producto al carrito
  router.post("/add", authMiddleware(1), async (req, res) => {
    const { idProduct, amount } = req.body;
    const result = await cartServ.addToCart(req.user.id, idProduct, amount);
    return res.status(result.error ? 400 : 200).json(result);
  });

  //Eliminar un producto del carrito
  router.put("/remove", authMiddleware(1), async (req, res) => {
    const result = await cartServ.removeFromCart( req.body.cartId, req.body.id);
    return res.status(result.error ? 400 : 200).json(result);
  });

  //Limpiar el carrito
  router.delete("/clear", authMiddleware(1), async (req, res) => {
    const result = await cartServ.clearCart(req.user.id);
    return res.status(result.error ? 400 : 200).json(result);
  });

  //
  router.use( async (req, res) => {
    return res.status(400 ).json({ success: false, error: true, message: 'Pagina no encontrada. :|', data: {}, errorDetails: null });
  });
}
module.exports = cart;
