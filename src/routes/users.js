// const express = require('express');
// const {
//   getUsers,
//   getUser,
//   updateUser,
//   deleteUser,
//   addAddress,
//   updateAddress,
//   deleteAddress,
//   getUserOrders
// } = require('../controllers/userController');
// const { protect, authorize } = require('../middleware/auth');

// const router = express.Router();

// // Admin routes
// router.use(protect);
// router.use(authorize('admin'));

// router.get('/', getUsers);
// router.get('/:id', getUser);
// router.put('/:id', updateUser);
// router.delete('/:id', deleteUser);

// // User address routes
// router.post('/address', protect, addAddress);
// router.put('/address/:addressId', protect, updateAddress);
// router.delete('/address/:addressId', protect, deleteAddress);

// // User orders
// router.get('/orders/my-orders', protect, getUserOrders);

// module.exports = router;

const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  addAddress,
  updateAddress,
  deleteAddress,
  getUserOrders
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Admin routes (only admin)
router.get('/', protect, authorize('admin'), getUsers);
router.get('/:id', protect, authorize('admin'), getUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

// User address routes (normal users)
router.post('/address', protect, addAddress);
router.put('/address/:addressId', protect, updateAddress);
router.delete('/address/:addressId', protect, deleteAddress);

// User orders
router.get('/orders/my-orders', protect, getUserOrders);

module.exports = router;
