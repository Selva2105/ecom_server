const express = require('express');
const { validationResult } = require('express-validator');
const CustomError = require('../utils/customError');
const orderValidators = require('../validators/orderValidators');
const { createOrder } = require('../controller/order.controller');
const router = express.Router();

// Route to create a new product
router.post('/', orderValidators.validateOrderFields, (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(err => `${err.msg} (${err.path}: ${err.value})`).join(', ');
        const customError = new CustomError(`Validation error: ${validationErrors}`, 400);
        next(customError);
    }
    createOrder(req, res, next);
});

module.exports = router;