const Review = require('../models/Review');
const Order = require('../models/Order');

// @desc    Create review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
  try {
    const { product, order, rating, title, comment } = req.body;

    // Validation
    if (!product || !order || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Please provide product, order, rating, and comment'
      });
    }

    // Check if order exists and belongs to user
    const userOrder = await Order.findOne({
      _id: order,
      user: req.user._id,
      orderStatus: 'delivered'
    });

    if (!userOrder) {
      return res.status(400).json({
        success: false,
        message: 'Order not found or not delivered yet'
      });
    }

    // Check if product is in the order
    const productInOrder = userOrder.items.find(item => 
      item.product.toString() === product
    );

    if (!productInOrder) {
      return res.status(400).json({
        success: false,
        message: 'Product not found in this order'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      user: req.user._id,
      product,
      order
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product for this order'
      });
    }

    const review = await Review.create({
      user: req.user._id,
      product,
      order,
      rating: parseInt(rating),
      title,
      comment
    });

    await review.populate('user', 'name');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: { review }
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating review'
    });
  }
};

// @desc    Get reviews for product
// @route   GET /api/reviews/product/:productId
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({
      product: req.params.productId,
      isApproved: true
    })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({
      product: req.params.productId,
      isApproved: true
    });

    // Get rating statistics
    const mongoose = require('mongoose');

const ratingStats = await Review.aggregate([
  {
    $match: {
      product: new mongoose.Types.ObjectId(req.params.productId),
      isApproved: true
    }
  },
  {
    $group: {
      _id: '$product',
      averageRating: { $avg: '$rating' },
      totalReviews: { $sum: 1 },
      ratingDistribution: { $push: '$rating' }
    }
  }
]);


    res.json({
      success: true,
      data: {
        reviews,
        statistics: ratingStats[0] || { averageRating: 0, totalReviews: 0 },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews'
    });
  }
};

// @desc    Get all reviews (Admin)
// @route   GET /api/reviews
// @access  Private/Admin
const getReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find()
      .populate('user', 'name email')
      .populate('product', 'name images')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments();

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews'
    });
  }
};

// @desc    Update review approval status
// @route   PUT /api/reviews/:id/approval
// @access  Private/Admin
const updateReviewApproval = async (req, res) => {
  try {
    const { isApproved } = req.body;

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true, runValidators: true }
    )
      .populate('user', 'name')
      .populate('product', 'name');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: `Review ${isApproved ? 'approved' : 'disapproved'} successfully`,
      data: { review }
    });
  } catch (error) {
    console.error('Update review approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating review approval'
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting review'
    });
  }
};

// @desc    Mark review as helpful
// @route   PUT /api/reviews/:id/helpful
// @access  Private
const markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user already marked as helpful
    const alreadyHelpful = review.helpful.users.includes(req.user._id);

    if (alreadyHelpful) {
      // Remove helpful mark
      review.helpful.users.pull(req.user._id);
      review.helpful.count = Math.max(0, review.helpful.count - 1);
    } else {
      // Add helpful mark
      review.helpful.users.push(req.user._id);
      review.helpful.count += 1;
    }

    await review.save();

    res.json({
      success: true,
      message: alreadyHelpful ? 'Removed helpful mark' : 'Marked as helpful',
      data: { helpful: review.helpful }
    });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking review as helpful'
    });
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getReviews,
  updateReviewApproval,
  deleteReview,
  markHelpful
};