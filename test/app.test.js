/**
 * @jest-environment node
 */
const request = require("supertest");
const app = require("../app");
const User = require("../models/user.model");

// Pretend DB connection made so that tests can run without error
// Bypass need to have actual DB connection
jest.mock("mongoose", () => {
  const actualMongoose = jest.requireActual("mongoose");
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue({}),
  };
});

// Mock the User model module so that we can test with mock user data
// Can mock the functions to further test responses
// Mock the user functionality such as save
jest.mock("../models/user.model");

// Mock user session module to test different scenarios needing sessions
jest.mock("express-session", () => {
  return () => (req, res, next) => {
    // Test for user session in different testing cases
    if (req.headers["_forcenosessionuser"] === "true") {
      req.session = {};
    } else {
      req.session = {
        user: { email: "test@example.com", username: "testuser" },
        destroy: (cb) => cb && cb(),
      };
    }
    next();
  };
});
// Testing Login and Register API
describe("Login/Register Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  // Test for missing fields
  test("POST /register returns 400 if fields are missing", async () => {
    const res = await request(app).post("/register").send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });
  // Test for invalid email
  test("POST /register returns 400 if email isnt valid", async () => {
    const res = await request(app).post("/register").send({
      username: "testuser",
      email: "test@examplecom",
      password: "password123",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Please enter a valid email address/i);
  });
  // Test for invalid password
  test("POST /register returns 400 if password isnt valid", async () => {
    const res = await request(app).post("/register").send({
      username: "testuser",
      email: "test@example.com",
      password: "passwo",
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Password must be at least 8 characters/i);
  });
  // Test for succussful user and correct DB info being saved
  test("POST /register creates user successfully", async () => {
    // Mock the User save function
    const mockSave = jest.fn().mockResolvedValue({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      portfolio: { availableFunds: 1000, stocks: [] },
    });
    // Call the save function
    User.mockImplementation(() => ({ save: mockSave }));

    const res = await request(app).post("/register").send({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    });

    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Registration successful/i);
  });
  // Test for email being associated with an account
  test("POST /login returns 401 if user not found", async () => {
    // No user found with that email scenario
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post("/login")
      .send({ email: "test@email.com", password: "password" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Email not associated/i);
  });
  // Test that password matches with what is in DB corresponding to Email
  test("POST /login returns 401 if password incorrect", async () => {
    // A user exists but passwords dont match
    User.findOne.mockResolvedValue({
      username: "testuser",
      email: "test@email.com",
      password: "password",
    });

    const res = await request(app)
      .post("/login")
      .send({ email: "test@email.com", password: "wrongPassword" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Incorrect password/i);
  });
  // Test correct email and password match found in DB sends user to Dashboard
  test("POST /login succeeds with valid credentials", async () => {
    User.findOne.mockResolvedValue({
      username: "testuser",
      email: "test@email.com",
      password: "password123",
    });

    const res = await request(app)
      .post("/login")
      .send({ email: "test@email.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.redirect).toBe("/dashboard");
  });
});
// Test for buy and sell API scenarios
describe("Buying/Selling Routes", () => {
  beforeEach(() => jest.clearAllMocks());
  // Test for user not logged in trying to buy
  test("POST /api/buyStock returns 401 if not logged in", async () => {
    const res = await request(app)
      .post("/api/buyStock")
      .set("_forcenosessionuser", "true")
      .send({ ticker: "AAPL", price: 100, quantity: 2 });

    expect(res.status).toBe(401);
  });
  // Test for logged in user with insufficient funds
  test("POST /api/buyStock returns 400 if not enough funds in account", async () => {
    const mockUser = {
      portfolio: { availableFunds: 100, stocks: [] },
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app)
      .post("/api/buyStock")
      .send({ ticker: "AAPL", price: 100, quantity: 5 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Insufficient funds/i);
  });
  // Test for succussful buy transaction
  test("POST /api/buyStock returns success if user has funds", async () => {
    const mockUser = {
      portfolio: { availableFunds: 1000, stocks: [] },
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app)
      .post("/api/buyStock")
      .send({ ticker: "AAPL", price: 100, quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Successful buy/i);
  });
  // Test for aggreagation in stocks already owned
  test("POST /api/buyStock returns success if user has funds", async () => {
    const mockUser = {
      portfolio: {
        availableFunds: 1000,
        stocks: [{ ticker: "TSLA", avgPrice: 100, quantity: 1 }],
      },
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app)
      .post("/api/buyStock")
      .send({ ticker: "TSLA", price: 100, quantity: -1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Successful buy/i);
    expect(mockUser.portfolio.stocks).toEqual([
      { ticker: "TSLA", avgPrice: 100, quantity: -1 },
    ]);
    expect(mockUser.save).toHaveBeenCalled();
  });
  // Test for user not logged in
  test("POST /api/sellStock returns 401 if not logged in", async () => {
    const res = await request(app)
      .post("/api/sellStock")
      .set("_forcenosessionuser", "true")
      .send({ ticker: "TSLA", price: 200, quantity: -1 });

    expect(res.status).toBe(401);
  });
  // Test for selling for a user not in DB
  test("POST /api/sellStock returns 404 if user not found", async () => {
    User.findOne.mockResolvedValue();
    const res = await request(app)
      .post("/api/sellStock")
      .send({ ticker: "TSLA", price: 200, quantity: -1 });

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/User not found/i);
  });
  // Test for if user has that no stock to sell
  test("POST /api/sellStock returns 400 if no stocks to sell", async () => {
    const mockUser = {
      portfolio: { availableFunds: 1000, stocks: [] },
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app)
      .post("/api/sellStock")
      .send({ ticker: "TSLA", price: 200, quantity: -1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Not enough stock to sell/i);
  });
  // Test for user not logged in trying to sell
  test("POST /api/sellStock returns 401 if not logged in", async () => {
    const mockUser = {
      portfolio: {
        availableFunds: 1000,
        stocks: [{ ticker: "TSLA", quantity: -1, avgPrice: 200 }],
      },
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app)
      .post("/api/sellStock")
      .send({ ticker: "TSLA", price: 200, quantity: -1 });

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Successful sell/i);
  });
});

describe("Logout Route", () => {
  test("POST /logout clears session and returns success", async () => {
    const res = await request(app).post("/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Logged out/i);
  });
});
