const express = require('express');
const { validationResult } = require('express-validator');
const CustomError = require('../utils/customError');
const router = express.Router();
const multer = require('multer');

// Import the validator function

const { createUser, signin, getAllUsers, verifyEmail, getUserById, deleteUserById, updateUserById, updateUserProfileById } = require('../controller/auth.controller');
const userValidators = require('../validators/userValidators');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single('file')

// Route to create a new user
router.post('/user', upload, userValidators.validateUserFields, userValidators.validateAddressFields, (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const validationErrors = errors.array().map(err => `${err.msg} (${err.path}: ${err.value})`).join(', ');
        const customError = new CustomError(`Validation error: ${validationErrors}`, 400);
        next(customError);
    }

    // Call the controller function to create the user
    createUser(req, res, next);
});

router.post('/login', signin)
router.get('/verifyEmail/:emailVerificationToken', verifyEmail);

router.get('/usersList', getAllUsers);
router.get('/user/:id', getUserById);
router.delete('/user/:id', deleteUserById)
router.patch('/user/:id', updateUserById);
router.patch('/userProfile/:id', upload, updateUserProfileById);


module.exports = router;