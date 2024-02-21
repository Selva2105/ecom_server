const express = require('express');
const { validationResult } = require('express-validator');
const CustomError = require('../utils/customError');
const router = express.Router();

// Import the validator function

const { createUser } = require('../controller/auth.controller');
const userValidators = require('../validators/userValidators');

// Route to create a new user
router.post('/user', userValidators.validateUserFields, userValidators.validateAddressFields, (req, res,next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(err => `${err.msg} (${err.path}: ${err.value})`).join(', ');
        const customError = new CustomError(`Validation error: ${validationErrors}`, 400);
        next(customError);
    }

    // Call the controller function to create the user
    createUser(req, res, next);
});

module.exports = router;