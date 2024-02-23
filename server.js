const express = require("express");
const cors = require("cors");
const CustomError = require("./utils/customError");
const globalErrorHandler = require("./middleware/globalErrorhandler");
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./utils/connectDB');
const morgan = require("morgan");

dotenv.config({});

// Define server port and MongoDB connection URL
const PORT = process.env.PORT || 3000;
const DBURL = process.env.MONGO_URL;

const app = express();

// CORS configuration for allowing cross-origin requests
const corsOptions = {
    origin: ["http://localhost:3006", "https://ikart-six.vercel.app"],
    methods: "GET,PUT,PATCH,POST,DELETE",
    credentials: true,
};

// Import routers for different API endpoints


// Use JSON parsing middleware
app.use(express.json());

// Enable CORS with specified options
app.use(cors(corsOptions));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(morgan(':method :url :status :res[content-length] - :response-time ms'))
// Root route to display a welcome message
app.get('/', (req, res) => {
    res.send('Welcome to the root of the server!');
});

app.use('/api/v1/auth',require('./router/auth.router'));
app.use('/api/v1/product',require('./router/product.router'));
app.use('/api/v1/orders',require('./router/order.router'))

// 404 route - Handles requests to undefined routes
app.all("*", (req, res, next) => {
    const err = new CustomError(
        `Can't find ${req.originalUrl} on the server`,
        404
    );
    next(err);
});

// Global error handler middleware - Handles errors throughout the application
app.use(globalErrorHandler);

// Call the MongoDB connection function with the provided URL
connectDB(DBURL);

// Start the server and listen on the specified port
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server is running on port: ${PORT}`);
    });
}

module.exports = app;