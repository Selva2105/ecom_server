const { nextDay } = require("date-fns");
const Order = require("../model/order.modal");
const User = require("../model/user.modal");
const CustomError = require("../utils/customError");
const asyncErrorHandler = require('../utils/asyncErrorHandler');
const { Product } = require("../model/product.modal");

// Controller function to create a new order
const createOrder = asyncErrorHandler(async (req, res, next) => {

    // Extract order data from the request body
    const { user, items, totalAmount, status, paymentDetails, shippingDetails } = req.body;

    const existingUser = await User.findById(user);

    if (!existingUser) {
        const error = new CustomError('User not found', 404);
        next(error)
    }

    // Check if the product with the specified variant exists
    for (const item of items) {
        const { product, variant } = item;
        const existingProduct = await Product.findOne({ _id: product, 'variants._id': variant });
        if (!existingProduct) {
            const error = new CustomError(`Product not found`, 404);
            return next(error);
        }
    }

    // Create a new order instance
    const newOrder = new Order({
        user,
        items,
        totalAmount,
        status,
        paymentDetails,
        shippingDetails
    });

    // Save the new order to the database
    const savedOrder = await newOrder.save();

    // Respond with the saved order
    res.status(201).json({
        status: "success",
        message: 'Order created successfully',
        order: savedOrder
    });

});

// Export the controller function for use in routes
module.exports = { createOrder };