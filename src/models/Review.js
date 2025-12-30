const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true
  },
  order: {
    type: mongoose.Schema.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot be more than 5']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    maxlength: [500, 'Comment cannot be more than 500 characters']
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  helpful: {
    count: { type: Number, default: 0 },
    users: [{ type: mongoose.Schema.ObjectId, ref: 'User' }]
  }
}, {
  timestamps: true
});

// Ensure one review per product per user per order
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

// Update product rating when review is created, updated, or deleted
reviewSchema.post('save', async function() {
  await this.constructor.calculateProductRating(this.product);
});

reviewSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    await doc.constructor.calculateProductRating(doc.product);
  }
});

reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    await doc.constructor.calculateProductRating(doc.product);
  }
});

// Static method to calculate average rating
reviewSchema.statics.calculateProductRating = async function(productId) {
  const stats = await this.aggregate([
    {
      $match: { product: productId, isApproved: true }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        numberOfReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      rating: {
        average: Math.round(stats[0].averageRating * 10) / 10,
        count: stats[0].numberOfReviews
      }
    });
  } else {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      rating: {
        average: 0,
        count: 0
      }
    });
  }
};

module.exports = mongoose.model('Review', reviewSchema);