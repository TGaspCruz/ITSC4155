/**
 * @jest-environment node
 */
const request = require('supertest');
const app = require('../app');
const User = require('../models/user.model');

/* ------------------------------------------------------------------
   🧩 Mocks
-------------------------------------------------------------------*/

// ✅ Keep real Mongoose internals (Schema, model, etc.), but mock connect()
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue({}),
  };
});

// ✅ Mock the User model methods
jest.mock('../models/user.model');

// ✅ Mock express-session middleware with conditional control
jest.mock('express-session', () => {
  return () => (req, res, next) => {
    // Allow tests to flag "no logged-in user" cases
    if (req.headers['_forcenosessionuser'] === 'true') {
      req.session = {}; // simulate not logged in
    } else {
      req.session = {
        user: { email: 'test@example.com', username: 'testuser' },
        destroy: (cb) => cb && cb(), // simulate working destroy()
      };
    }
    next();
  };
});

/* ------------------------------------------------------------------
   🧩 Test Suites
-------------------------------------------------------------------*/

describe('Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /register → returns 400 if fields are missing', async () => {
    const res = await request(app).post('/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  test('POST /register → creates user successfully', async () => {
    const mockSave = jest.fn().mockResolvedValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      portfolio: { availableFunds: 1000, stocks: [] },
    });

    User.mockImplementation(() => ({ save: mockSave }));

    const res = await request(app)
      .post('/register')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

    expect(mockSave).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Registration successful/i);
  });

  test('POST /login → returns 401 if user not found', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/login')
      .send({ email: 'notfound@example.com', password: 'password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Email not associated/i);
  });

  test('POST /login → returns 401 if password incorrect', async () => {
    User.findOne.mockResolvedValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'correctPassword',
    });

    const res = await request(app)
      .post('/login')
      .send({ email: 'test@example.com', password: 'wrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Incorrect password/i);
  });

  test('POST /login → succeeds with valid credentials', async () => {
    User.findOne.mockResolvedValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });

    const res = await request(app)
      .post('/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.redirect).toBe('/dashboard');
  });
});

describe('Portfolio Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST /api/buyStock → returns 401 if not logged in', async () => {
    const res = await request(app)
      .post('/api/buyStock')
      .set('_forcenosessionuser', 'true') // flag for mock
      .send({ ticker: 'AAPL', price: 100, quantity: 2 });

    expect(res.status).toBe(401);
  });

  test('POST /api/buyStock → returns success if user has funds', async () => {
    const mockUser = {
      portfolio: { availableFunds: 1000, stocks: [] },
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/buyStock')
      .send({ ticker: 'AAPL', price: 100, quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Successful buy/i);
  });

  test('POST /api/sellStock → returns 401 if not logged in', async () => {
    const res = await request(app)
      .post('/api/sellStock')
      .set('_forcenosessionuser', 'true')
      .send({ ticker: 'TSLA', price: 200, quantity: 1 });

    expect(res.status).toBe(401);
  });
});

describe('Logout Route', () => {
  test('POST /logout → clears session and returns success', async () => {
    const res = await request(app).post('/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Logged out/i);
  });
});
