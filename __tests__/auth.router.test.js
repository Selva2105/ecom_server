const request = require("supertest");
const User = require("../model/user.modal");
const app = require("../server");
const connectDB = require("../utils/connectDB");

beforeAll(async () => {
  await connectDB(
    "mongodb+srv://selvaganapathikanakaraj2105:FhidJdraQBaUJm7K@ecomcluster.p2asger.mongodb.net/ecom?retryWrites=true&w=majority"
  );
});

describe("Auth Routes", () => {
  describe("POST /api/v1/auth/user", () => {
    it("should create a new user and return 201 status", async () => {
      const userData = {
        firstName: "Test",
        lastName: "User",
        userName: "testuser",
        email: "testuser@example.com",
        password: "password123",
        confirmPassword: "password123",
        addresses: [
          {
            type: "billing",
            street: "123 Test St",
            city: "Test City",
            district: "Test District",
            state: "Test State",
            country: "Test Country",
            pincode: "123456",
            isPrimary: true,
          },
        ],
        phone: {
          country_code: "+1",
          number: "1234567890",
        },
        profilePicture: "test.jpg",
        dateOfBirth: "1990-01-01",
      };

      const response = await request(app)
        .post("/api/v1/auth/user")
        .send(userData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("message", "User created successfully");
      expect(response.body.user).toHaveProperty("email", userData.email);
    });
  });

});
