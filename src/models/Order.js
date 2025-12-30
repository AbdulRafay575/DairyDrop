const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true
  },
  name: String,
  price: Number,
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  image: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  deliveryAddress: {
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contactNumber: {
    type: String,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['cod'],
    default: 'cod'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'packed', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryDate: {
    type: Date,
    required: true
  },
  deliveredAt: Date,
  cancellationReason: String
}, {
  timestamps: true
});

// ONLY pre-save hook (this is safe)
orderSchema.pre('save', async function() {
  if (this.isNew) {
    const date = new Date();
    const timestamp = date.getTime();
    const random = Math.floor(Math.random() * 1000);
    this.orderNumber = `DD${timestamp}${random}`;
  }
});



// ❌ NO MORE HOOKS BELOW THIS LINE ❌

module.exports = mongoose.model('Order', orderSchema);
