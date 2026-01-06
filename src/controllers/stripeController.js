const Stripe = require('stripe');
const Order = require('../models/Order');

// Helper to initialize Stripe
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Webhook handler expects raw body (Buffer)
const webhookHandler = async (req, res) => {
	const stripe = getStripe();
	const sig = req.headers['stripe-signature'];
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	let event;
	try {
		if (webhookSecret) {
			event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
		} else {
			const raw = req.body;
			if (raw && raw instanceof Buffer) {
				event = JSON.parse(raw.toString('utf8'));
			} else {
				event = req.body;
			}
		}
	} catch (err) {
		console.error('Webhook signature verification failed.', err && err.message ? err.message : err);
		return res.status(400).send(`Webhook Error: ${err && err.message ? err.message : 'invalid payload'}`);
	}

	try {
		switch (event.type) {
			case 'payment_intent.succeeded': {
				const paymentIntent = event.data.object;
				const paymentId = paymentIntent.id;
				const metadata = paymentIntent.metadata || {};
				const orderId = metadata.orderId || null;

				let order = null;
				if (orderId) order = await Order.findById(orderId);
				if (!order) order = await Order.findOne({ paymentIntentId: paymentId });

				if (order) {
					order.isPaid = true;
					order.paidAt = new Date();
					order.paymentStatus = 'paid';
					order.paymentIntentId = paymentId;
					order.orderStatus = 'confirmed';
					await order.save();
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
					order.isPaid = false;
					order.paymentStatus = 'failed';
					await order.save();
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
				}
				break;
			}

			default:
				console.log(`Unhandled event type ${event.type}`);
		}

		res.json({ received: true });
	} catch (err) {
		console.error('Error handling webhook event:', err);
		res.status(500).send('Server error');
	}
};

// Simple connectivity test endpoint
const testConnectivity = async (req, res) => {
	if (!process.env.STRIPE_SECRET_KEY) {
		return res.status(500).json({ success: false, message: 'STRIPE_SECRET_KEY not set in environment' });
	}

	const stripe = getStripe();
	try {
		const pi = await stripe.paymentIntents.create({
			amount: 100,
			currency: process.env.STRIPE_CURRENCY || 'usd',
			description: 'Connectivity test - Dairy Drop',
			metadata: { test: 'connectivity' }
		});

		try { await stripe.paymentIntents.cancel(pi.id); } catch (e) { /* ignore */ }

		return res.json({ success: true, message: 'Stripe connectivity OK', paymentIntentId: pi.id });
	} catch (err) {
		console.error('Stripe connectivity error:', err);
		return res.status(500).json({ success: false, message: 'Stripe connectivity failed', error: err.message });
	}
};

module.exports = {
	webhookHandler,
	testConnectivity
};