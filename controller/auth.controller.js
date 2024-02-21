const User = require("../model/user.modal");
const SignToken = require("../utils/SignToken");
const asyncErrorHandler = require('../utils/asyncErrorHandler')
const jwt = require('jsonwebtoken');

// Function to create a new user
exports.createUser = asyncErrorHandler(async (req, res, next) => {
    // Destructure the request body
    const { firstName, lastName, userName, email, password, confirmPassword, addresses, phone, profilePicture, dateOfBirth } = req.body;

    // Check if password and confirmPassword match
    if (password !== confirmPassword) {
        throw new CustomError('Passwords do not match', 400);
    }

    // Create a new user instance without the confirmPassword field
    const user = new User({
        firstName,
        lastName,
        userName,
        email,
        password, // Password hashing is handled in the model
        addresses,
        phone,
        profilePicture,
        dateOfBirth,
    });

    // Save the user to the database
    await user.save();

    // Prepare the response object without sensitive data
    const userResponse = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.userName,
        email: user.email,
        addresses: user.addresses,
        phone: user.phone,
        profilePicture: user.profilePicture,
        dateOfBirth: user.dateOfBirth,
    };

    // Generate token using SignToken utility
    const token = SignToken(user._id.toString());

    // Include the token in the response if needed
    res.status(201).json({
        message: 'User created successfully',
        user: userResponse,
        token, 
    });
});


exports.signin = asyncErrorHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.isValidPassword(password))) {
        throw new CustomError('Invalid email or password', 401);
    }

    // Use SignToken to generate the token
    const token = SignToken(user._id.toString());

    res.status(200).json({
        message: 'Signed in successfully',
        token,
    });
});

exports.getAllUsers = asyncErrorHandler(async (req, res, next) => {
    const users = await User.find().select('-password');
    res.status(200).json(users);
});

exports.getUserById = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
        throw new CustomError('User not found', 404);
    }
    res.status(200).json(user);
});

exports.updateUserById = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
    if (!user) {
        throw new CustomError('User not found', 404);
    }
    res.status(200).json(user);
});

exports.deleteUserById = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
        throw new CustomError('User not found', 404);
    }
    res.status(204).send();
});