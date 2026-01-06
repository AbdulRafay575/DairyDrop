const express = require('express');
const { webhookHandler, testConnectivity } = require('../controllers/stripeController');
const router = express.Router();

// IMPORTANT: Stripe webhook needs raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

// Connectivity check: GET /api/stripe/test
router.get('/test', testConnectivity);

module.exports = router;