const { body } = require('express-validator');

const orderValidators = {
    validateOrderFields: [
        // Order fields validators
        body('user').isMongoId().notEmpty(),
        body('items').isArray().notEmpty(),
        body('items.*.product').isMongoId().notEmpty(),
        body('items.*.variant').isMongoId().notEmpty(),
        body('items.*.quantity').isInt({ min: 1 }).notEmpty(),
        body('totalAmount').isNumeric().notEmpty(),
        body('status').isIn(['processing', 'confirmed', 'shipped', 'delivered', 'cancelled']),
        body('paymentDetails.method').isIn(['credit_card', 'debit_card', 'paypal', 'cod', 'bank_transfer']).notEmpty(),
        body('paymentDetails.transactionId').optional().isString(),
        body('paymentDetails.status').isIn(['pending', 'completed', 'failed', 'refunded']),
        body('shippingDetails.address').isMongoId().notEmpty(),
        body('shippingDetails.trackingNumber').optional().isString(),
        body('shippingDetails.carrier').optional().isString(),
        body('shippingDetails.estimatedDelivery').optional().isISO8601().toDate()
    ]
};

module.exports = orderValidators;