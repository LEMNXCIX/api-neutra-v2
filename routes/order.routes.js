const express = require("express");
const OrderService = require("../services/order.services");
const authMiddleware = require("../middleware/auth.middleware");

/**
 * Todas las rutas de la orden
 * @param {*} app Express
 */
function order(app) {
  const router = express.Router();
  const orderServ = new OrderService();

  app.use("/api/order", router);

  //Crear la ordern
  router.post("/", authMiddleware(1), async (req, res) => {
    const result = await orderServ.create(req.user.id);
    return res.status(result.error ? 400 : 200).json(result);
  });

  //Obtener los productos de la orden
  router.get("/", authMiddleware(1), async (req, res) => {
    const result = await orderServ.getAll(req.user.id);
    return res.status(result.error ? 400 : 200).json(result);
  });
 //Obtener todas las ordenes
 router.get("/all", authMiddleware(1), async (req, res) => {
    const result = await orderServ.getAll(req.user.id);
    return res.status(result.error ? 400 : 200).json(result);
  });

  //Obtener una order por Id de orden
  router.get("/getOrder", authMiddleware(1), async (req, res) => {
    const { orderId } = req.body;
    const result = await orderServ.getOrderById(orderId);
    return res.status(result.error ? 400 : 200).json(result);
  });

//Obtener todas las ordenes de un usuario
router.get("/getOrderByUser", authMiddleware(1), async (req, res) => {
  const { userId } = req.body;
  const result = await orderServ.getOrderByUser(userId);
  return res.status(result.error ? 400 : 200).json(result);
});
  //Cambiar estado de la ordern
  router.put("/changeStatus", authMiddleware(2), async(req, res)=>{
    const {idOrder, status} = req.body
    const result = await orderServ.changeStatus(idOrder,status)
    return res.status(result.error ? 400 : 200).json(result);
  })
  //Borrar la orden
  router.delete("/clear", authMiddleware(1), async (req, res) => {
    const result = await orderServ.clearCart(req.user.id);
    return res.status(result.error ? 400 : 200).json(result);
  });
}
module.exports = order;
