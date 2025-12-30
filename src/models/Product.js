const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    // enum: ['milk', 'yogurt', 'cheese', 'butter', 'cream', 'ghee', 'ice-cream', 'paneer', 'other']
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  images: [{
    url: String,
    alt: String
  }],
  nutritionalFacts: {
    fatContent: { type: Number, min: 0 }, // in grams
    proteinContent: { type: Number, min: 0 }, // in grams
    carbohydrateContent: { type: Number, min: 0 }, // in grams
    calories: { type: Number, min: 0 }, // in kcal
    calcium: { type: Number, min: 0 }, // in mg
    vitamins: [String]
  },
  shelfLife: {
    type: Number, // in days
    required: true
  },
  storageInstructions: {
    type: String,
    default: 'Store in refrigerator at 4°C or below'
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative']
  },
  unit: {
    type: String,
    required: true,
    // enum: ['ml', 'l', 'g', 'kg', 'piece', 'pack'],
    default: 'piece'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  tags: [String],
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Index for better search performance
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ 'rating.average': -1 });

module.exports = mongoose.model('Product', productSchema);