const User = require("../model/user.modal");
const SignToken = require("../utils/SignToken");
const asyncErrorHandler = require('../utils/asyncErrorHandler')
const path = require('path');
const CustomError = require("../utils/customError");
const emailTemplate = require("../view/email-template");
const sendMail = require("../utils/mailer");
const { giveCurrentDateTime } = require("../utils/dateUtils");

const { initializeApp } = require("firebase/app");
const config = require('../config/firebaseConfig');
const { ref, getDownloadURL, uploadBytesResumable, deleteObject } = require('firebase/storage');
const { getStorage } = require("firebase/storage");

initializeApp(config.firebaseConfig);

const storage = getStorage();


// Function to create a new user
exports.createUser = asyncErrorHandler(async (req, res, next) => {
    // Destructure the request body
    const { firstName, lastName, userName, email, password, confirmPassword, addresses, phone, dateOfBirth } = req.body;

    // Check if password and confirmPassword match
    if (password !== confirmPassword) {
        const error = new CustomError('Passwords do not match', 400);
        next(error)
    }

    const dateTime = giveCurrentDateTime();

    const storageRef = ref(storage, `images/user/${req.file.originalname + " " + dateTime}`);

    const metadata = {
        contentType: req.file.mimetype,
    };

    const snapshot = await uploadBytesResumable(storageRef, req.file.buffer, metadata);

    const profileUrl = await getDownloadURL(snapshot.ref);

    // Create a new user instance without the confirmPassword field
    const user = new User({
        firstName,
        lastName,
        userName,
        email,
        password,
        addresses,
        phone,
        profilePicture: profileUrl,
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
    } catch (err) {
        await User.findByIdAndDelete(user._id);
        const error = new CustomError('Error sending email. User creation failed.', 500);
        next(error)
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
        const error = new CustomError('Token not found', 404)
        next(error)
    }

    if (!user || user.emailVerificationExpires < Date.now()) {
        const error = new CustomError('Invalid or expired verification token', 400);
        next(error)
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
        const error = new CustomError('Invalid email or password', 401);
        next(error)
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
        const error = new CustomError('User not found', 404);
        next(error)
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
        const error = new CustomError('User not found', 404);
        next(error)
    }

    // Check if the user is trying to update restricted fields
    const restrictedFields = ['email', 'profilePicture', 'password', 'role', 'backupCodes', 'emailVerificationToken', 'emailVerificationExpires', 'passwordResetToken', 'passwordResetExpires'];
    for (const field of restrictedFields) {
        if (rest[field] !== undefined) {
            const error = new CustomError(`You are not allowed to update the field: ${field}`, 400);
            next(error)
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
    const user = await User.findById(req.params.id);

    if (!user) {
        const error = new CustomError('User not found', 404);
        next(error);
        return;
    }

    // Extract the path from the provided Firebase Storage URL
    const profilePictureUrl = user.profilePicture;
    const urlDecoded = decodeURIComponent(profilePictureUrl);
    const imagePath = urlDecoded.split('/o/')[1].split('?')[0];

    // Create a reference to the file to delete
    const imageRef = ref(storage, imagePath);

    // Delete the file
    deleteObject(imageRef).then(() => {
        console.log("Profile picture deleted successfully.");
    }).catch((err) => {
        console.error("Error deleting profile picture:", err);
        const error = new CustomError('Something went wrong image cannot be deleted', 500);
        next(error)
    });

    // Proceed to delete the user from the database
    await User.findByIdAndDelete(req.params.id);

    res.status(204).json({
        status: "success",
        message: `User and associated profile picture deleted successfully`,
    });
});

exports.updateUserProfileById = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;

    // Find the user by ID
    const user = await User.findById(id);

    if (!user) {
        const error = new CustomError('User not found', 404);
        next(error);
        return;
    }

    // If there's a new profile picture, update it in Firebase Storage
    if (req.file.originalname) {
        // Extract the path from the existing profile picture URL
        const existingProfilePictureUrl = user.profilePicture;
        const urlDecoded = decodeURIComponent(existingProfilePictureUrl);
        const imagePath = urlDecoded.split('/o/')[1].split('?')[0];

        // Create a reference to the existing file to delete
        const imageRef = ref(storage, imagePath);

        // Delete the existing file
        try {
            await deleteObject(imageRef);
            console.log("Existing profile picture deleted successfully.");
        } catch (err) {
            console.error("Error deleting existing profile picture:", err);
            const error = new CustomError('Something went wrong, existing image cannot be deleted', 500);
            next(error);
            return;
        }

        // Upload the new profile picture
        const dateTime = giveCurrentDateTime();
        const newStorageRef = ref(storage, `images/user/${req.file.originalname + " " + dateTime}`);
        const metadata = {
            contentType: req.file.mimetype,
        };

        try {
            const snapshot = await uploadBytesResumable(newStorageRef, req.file.buffer, metadata);
            const newProfileUrl = await getDownloadURL(snapshot.ref);
            user.profilePicture = newProfileUrl;
            user.save();
            res.status(200).json({
                status: "success",
                message: 'User profile updated successfully',
            });
        } catch (err) {
            console.error("Error uploading new profile picture:", err);
            const error = new CustomError('Error uploading new profile picture', 500);
            next(error);
            return;
        }
    }


});