const express = require('express');
const { webhookHandler } = require('../controllers/stripeController');
const router = express.Router();

// IMPORTANT: Stripe webhook needs raw body for signature verification
router.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

module.exports = router;