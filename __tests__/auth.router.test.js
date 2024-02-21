const request = require("supertest");
const User = require("../model/user.modal");
const app = require("../server");

describe("Auth Routes", () => {
  describe("POST /api/v1/auth/user", () => {
    it("should create a new user and return 201 status", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        userName: "johndoe",
        email: "selvaganapathikanakaraj2105@gmail.com",
        password: "password123",
        confirmPassword: "password123",
        addresses: [
          {
            type: "billing",
            street: "123 Main St",
            city: "City",
            district: "District",
            state: "State",
            country: "Country",
            pincode: "12345",
            isPrimary: true,
          },
        ],
        phone: {
          country_code: "+1",
          number: "1234567890",
        },
        profilePicture: "profile.jpg",
        dateOfBirth: "1990-01-01",
      };

      const response = await request(app)
        .post("/api/v1/auth/user")
        .send(userData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty(
        "message",
        "User created successfully"
      );
      expect(response.body.user).toHaveProperty("email", userData.email);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("Should login a user and return 200 status", async () => {
      const loginDetails = {
        email: "selvaganapathikanakaraj2105@gmail.com",
        password: "password123",
      };

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send(loginDetails)

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Signed in successfully"
      );
    });
  });

  describe("GET /api/v1/auth/usersList", () => {
    it("Should return all the users and return 200 status", async () => {
      const response = await request(app)
        .get('/api/v1/auth/usersList');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "All users fetched successfully"
      );
      expect(response.body).toHaveProperty("users");
    });
  });

  describe("GET /api/v1/auth/user/:id", () => {
    it("Should return user details by ID and return 200 status", async () => {
      const user = await User.findOne();
      const response = await request(app)
        .get(`/api/v1/auth/user/${user._id}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        `${user.userName} details fetched successfully`
      );
      expect(response.body).toHaveProperty("user");
    });
  });

  describe("GET /api/v1/auth/user/:id", () => {
    it("Should return user details by ID and return 200 status", async () => {
      const user = await User.findOne();
      const response = await request(app)
        .delete(`/api/v1/auth/user/${user._id}`);

      expect(response.statusCode).toBe(204);

    });
  });

  afterAll(async () => {
    await User.deleteOne({ email: "selvaganapathikanakaraj2105@gmail.com" });
  });
});
