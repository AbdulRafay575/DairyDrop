const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getBrands
} = require('../controllers/productController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getProducts);
router.get('/categories', getCategories);
router.get('/brands', getBrands);
router.get('/:id', getProduct);

// Admin routes
router.use(protect);
router.use(authorize('admin'));

router.post('/', upload.array('images', 5), handleUploadError, createProduct);
router.put('/:id', upload.array('images', 5), handleUploadError, updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;