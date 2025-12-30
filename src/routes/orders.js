const express = require('express');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  getMyOrders,
  cancelOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createOrder);
router.get('/user/my-orders', getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);

// Admin routes
router.use(authorize('admin'));
router.get('/', getOrders);
router.put('/:id/status', updateOrderStatus);

module.exports = router;