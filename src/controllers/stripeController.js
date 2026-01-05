const Stripe = require('stripe');
const Order = require('../models/Order');
const User = require('../models/User');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create Stripe PaymentIntent for an order
// @route   POST /api/orders/:id/pay
// @access  Private
const createPaymentIntent = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Check authorization
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to pay for this order' 
      });
    }

    // Check if order is already paid
    if (order.paymentStatus === 'paid' || order.isPaid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order already paid' 
      });
    }

    // Check if order is cancelled
    if (order.orderStatus === 'cancelled') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot pay for cancelled order' 
      });
    }

    // Check if delivery date is in the past
    if (order.deliveryDate < new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Delivery date has passed. Please create a new order.' 
      });
    }

    // Convert amount to smallest currency unit (cents/paise)
    const amount = Math.round(order.totalAmount * 100);

    // Create or retrieve Stripe customer
    let stripeCustomerId;
    const user = await User.findById(req.user._id);
    
    if (user.stripeCustomerId) {
      stripeCustomerId = user.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        phone: user.phone,
        metadata: {
          userId: user._id.toString()
        }
      });
      stripeCustomerId = customer.id;
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: process.env.STRIPE_CURRENCY || 'usd',
      customer: stripeCustomerId,
      metadata: { 
        orderId: order._id.toString(), 
        userId: req.user._id.toString(),
        orderNumber: order.orderNumber
      },
      description: `Order #${order.orderNumber}`,
      shipping: order.deliveryAddress ? {
        name: user.name,
        phone: user.phone,
        address: {
          line1: order.deliveryAddress.street,
          city: order.deliveryAddress.city,
          state: order.deliveryAddress.state,
          postal_code: order.deliveryAddress.zipCode,
          country: order.deliveryAddress.country || 'IN'
        }
      } : undefined,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update order with payment details
    order.paymentIntentId = paymentIntent.id;
    order.stripeCustomerId = stripeCustomerId;
    order.paymentStatus = 'processing';
    order.paymentMethod = 'card';
    await order.save();

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        amount: order.totalAmount,
        currency: paymentIntent.currency
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    
    // Handle Stripe-specific errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Server error while creating payment' 
    });
  }
};

// @desc    Get payment intent status
// @route   GET /api/orders/:id/payment-status
// @access  Private
const getPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check authorization
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment'
      });
    }

    if (!order.paymentIntentId) {
      return res.json({
        success: true,
        data: {
          paymentStatus: order.paymentStatus,
          isPaid: order.isPaid
        }
      });
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);

    res.json({
      success: true,
      data: {
        paymentStatus: paymentIntent.status,
        orderPaymentStatus: order.paymentStatus,
        isPaid: order.isPaid,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          clientSecret: paymentIntent.client_secret,
          created: paymentIntent.created
        }
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching payment status'
    });
  }
};

// @desc    Stripe webhook handler
// @route   POST /api/stripe/webhook
// @access  Public (Stripe calls this)
const webhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (webhookSecret) {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const paymentId = paymentIntent.id;
        
        // Find order by payment intent ID
        let order = await Order.findOne({ paymentIntentId: paymentId });
        
        if (!order && paymentIntent.metadata?.orderId) {
          order = await Order.findById(paymentIntent.metadata.orderId);
        }

        if (order) {
          order.isPaid = true;
          order.paidAt = new Date();
          order.paymentStatus = 'paid';
          order.orderStatus = 'confirmed'; // Move to confirmed when paid
          
          // Save payment method details if available
          if (paymentIntent.payment_method) {
            const paymentMethod = await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
            order.paymentDetails = {
              paymentMethod: paymentMethod.type,
              last4: paymentMethod.card?.last4 || '',
              brand: paymentMethod.card?.brand || ''
            };
          }
          
          await order.save();
          console.log(`Order ${order.orderNumber} marked as paid`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const paymentId = paymentIntent.id;
        
        let order = await Order.findOne({ paymentIntentId: paymentId });
        
        if (!order && paymentIntent.metadata?.orderId) {
          order = await Order.findById(paymentIntent.metadata.orderId);
        }

        if (order) {
          order.paymentStatus = 'failed';
          order.paymentMethod = 'card';
          await order.save();
          console.log(`Payment failed for order ${order.orderNumber}`);
        }
        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object;
        const paymentId = paymentIntent.id;
        
        let order = await Order.findOne({ paymentIntentId: paymentId });
        
        if (!order && paymentIntent.metadata?.orderId) {
          order = await Order.findById(paymentIntent.metadata.orderId);
        }

        if (order) {
          order.paymentStatus = 'failed';
          await order.save();
          console.log(`Payment canceled for order ${order.orderNumber}`);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentId = charge.payment_intent;
        
        if (paymentId) {
          const order = await Order.findOne({ paymentIntentId: paymentId });
          if (order) {
            order.paymentStatus = 'refunded';
            await order.save();
            console.log(`Payment refunded for order ${order.orderNumber}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Server error');
  }
};

module.exports = {
  createPaymentIntent,
  getPaymentStatus,
  webhookHandler
};