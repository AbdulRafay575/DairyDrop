const express = require('express');
const {
  createReview,
  getProductReviews,
  getReviews,
  updateReviewApproval,
  deleteReview,
  markHelpful
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/product/:productId', getProductReviews);

// User routes
router.use(protect);

router.post('/', createReview);
router.put('/:id/helpful', markHelpful);

// Admin routes
router.use(authorize('admin'));
router.get('/', getReviews);
router.put('/:id/approval', updateReviewApproval);
router.delete('/:id', deleteReview);

module.exports = router;