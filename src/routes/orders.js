const express = require('express');
const {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  getMyOrders,
  cancelOrder,
  createPaymentIntent,
  getPaymentStatus
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createOrder);
router.get('/user/my-orders', getMyOrders);
router.post('/:id/pay', createPaymentIntent); // New payment route
router.get('/:id/payment-status', getPaymentStatus); // New status route
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);

// Admin routes
router.use(authorize('admin'));
router.get('/', getOrders);
router.put('/:id/status', updateOrderStatus);

module.exports = router;