// test-stripe.js - simple Stripe connectivity test
// Usage: set STRIPE_TEST_KEY env var or ensure STRIPE_SECRET_KEY in .env, then run `node test-stripe.js`
require('dotenv').config();
const Stripe = require('stripe');

const key = process.env.STRIPE_TEST_KEY || process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('No Stripe key provided. Set STRIPE_TEST_KEY or STRIPE_SECRET_KEY in environment.');
  process.exit(1);
}

const stripe = new Stripe(key.trim());

async function run() {
  try {
    console.log('Using key length:', key.trim().length);

    const pi = await stripe.paymentIntents.create({
      amount: 100, // smallest currency unit
      currency: process.env.STRIPE_CURRENCY || 'usd',
      description: 'Dairy Drop connectivity test',
      metadata: { test: 'true' }
    });

    console.log('✅ PaymentIntent created:', pi.id);
    console.log('Client secret (partial):', pi.client_secret ? pi.client_secret.substring(0, 10) + '...' : 'n/a');

    // Cancel the intent to keep account clean
    try {
      await stripe.paymentIntents.cancel(pi.id);
      console.log('✅ PaymentIntent cancelled for cleanliness');
    } catch (e) {
      console.warn('Could not cancel PaymentIntent:', e.message);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Stripe test failed:', err.message || err);
    if (err.statusCode) console.error('Status code:', err.statusCode);
    process.exit(2);
  }
}

run();