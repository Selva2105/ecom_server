const mongoose = require('mongoose');
const generateOrderNumber = require('../utils/generateOrderNumber')

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variant: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    }
});

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [orderItemSchema],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['processing', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentDetails: {
        method: {
            type: String,
            enum: ['credit_card', 'debit_card', 'paypal', 'cod', 'bank_transfer'],
            required: true
        },
        transactionId: {
            type: String
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        }
    },
    shippingDetails: {
        address: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User.addresses',
            required: true
        },
        trackingNumber: {
            type: String
        },
        carrier: {
            type: String
        },
        estimatedDelivery: {
            type: Date
        }
    }
}, { timestamps: true });

// Password hashing middleware
orderSchema.pre('save', async function (next) {
    this.orderNumber = generateOrderNumber();
    
    next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;