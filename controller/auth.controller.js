const User = require("../model/user.modal");
const SignToken = require("../utils/SignToken");
const asyncErrorHandler = require('../utils/asyncErrorHandler')
const path = require('path');
const CustomError = require("../utils/customError");
const emailTemplate = require("../view/email-template");
const sendMail = require("../utils/mailer");


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
        password,
        addresses,
        phone,
        profilePicture,
        dateOfBirth,
    });

    // Save the user to the database
    await user.save();

    // Log audit action for account creation
    const auditLog1 = {
        action: 'Creation',
        timestamp: new Date(),
        details: `Account created using the email : ${user.email}`
    };

    const auditLog2 = {
        action: 'Verification',
        timestamp: new Date(),
        details: `Account verification email sent to the user email sent to : ${user.email}`
    }


    // In auth.controller.js, when creating a new user, send an email using nodemailer
    const mailOptions = {
        from: process.env.ADMIN_MAILID,
        to: user.email,
        subject: 'Welcome to Sky kart! Verify your email',
        html: emailTemplate(`https://ecom-server-beta.vercel.app/api/v1/auth/verifyEmail/${user.emailVerificationToken}`, user.firstName)
    };

    // Store the sendMail function in a variable
    const sendMailFunction = sendMail;

    try {
        await sendMailFunction(mailOptions);
    } catch (error) {
        await User.findByIdAndDelete(user._id);
        throw new CustomError('Error sending email. User creation failed.', 500);
    }

    // Add the audit log to the user's auditLogs array
    user.auditLogs.push(auditLog1, auditLog2);
    // Save the updated user with the audit log
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

    res.status(201).json({
        status: "success",
        message: 'User created successfully',
        user: userResponse,
        token,
    });
});

exports.verifyEmail = asyncErrorHandler(async (req, res, next) => {
    const { emailVerificationToken } = req.params;
    const user = await User.findOne({ emailVerificationToken });

    if (!emailVerificationToken) {
        throw new CustomError('Token not found', 404)
    }

    if (!user || user.emailVerificationExpires < Date.now()) {
        throw new CustomError('Invalid or expired verification token', 400);
    }

    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.isEmailVerified = true;

    const auditLog = {
        action: 'Verification',
        timestamp: new Date(),
        details: `User email verification was successfully done`
    };

    user.auditLogs.push(auditLog);

    await user.save();

    res.sendFile(path.join(__dirname, '../view/email-result.html'));
});


exports.signin = asyncErrorHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.isValidPassword(password))) {
        throw new CustomError('Invalid email or password', 401);
    }

    // Use SignToken to generate the token
    const token = SignToken(user._id.toString());

    if (token) {
        const auditLog = {
            action: 'Login',
            timestamp: new Date(),
            details: `User logged in through the email ${user.email}`
        }
        user.auditLogs.push(auditLog);
        user.isActive = true;

        user.save();
    }

    res.status(200).json({
        status: "success",
        message: 'Signed in successfully',
        token,
    });
});

exports.getAllUsers = asyncErrorHandler(async (req, res, next) => {

    const users = await User.find().select('-password -__v');

    res.status(200).json({
        status: "success",
        length: users.length,
        message: 'All users fetched successfully',
        users
    });
});

exports.getUserById = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id).select('-password -__v');

    if (!user) {
        throw new CustomError('User not found', 404);
    }

    res.status(200).json({
        status: "success",
        length: user.length,
        message: `${user.userName} details fetched successfully`,
        user
    });
});

exports.updateUserById = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { addresses, ...rest } = req.body;

    // Check if the user exists
    const user = await User.findById(id).select('-password -__v -backupCodes -emailVerificationToken -emailVerificationExpires -passwordResetToken -passwordResetExpires');
    if (!user) {
        throw new CustomError('User not found', 404);
    }

    // Check if the user is trying to update restricted fields
    const restrictedFields = ['email', 'password', 'role', 'backupCodes', 'emailVerificationToken', 'emailVerificationExpires', 'passwordResetToken', 'passwordResetExpires'];
    for (const field of restrictedFields) {
        if (rest[field] !== undefined) {
            throw new CustomError(`You are not allowed to update the field: ${field}`, 400);
        }
    }

    // Update or add addresses provided in the request
    if (addresses && addresses.length) {
        addresses.forEach(newAddress => {
            const existingAddressIndex = user.addresses.findIndex(addr =>
                addr._id.toString() === newAddress._id
            );

            if (existingAddressIndex > -1) {
                // Update existing address if _id matches
                user.addresses[existingAddressIndex] = { ...user.addresses[existingAddressIndex].toObject(), ...newAddress };
            } else {
                // Add new address if it doesn't exist
                user.addresses.push(newAddress);
            }
        });
    }

    const auditLog = {
        action: 'Updation',
        timestamp: new Date(),
        details: `User details updated successfully`
    }
    user.auditLogs.push(auditLog);

    // Save the updated user
    const updatedUser = await user.save();

    res.status(200).json({
        status: "success",
        message: `User updated successfully`,
        user: updatedUser
    });
});

exports.deleteUserById = asyncErrorHandler(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
        throw new CustomError('User not found', 404);
    }
    res.status(204).json({
        status: "success",
        message: `User deleted sucessfully`,
    });
});