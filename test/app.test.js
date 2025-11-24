/**
 * @jest-environment node
 */
const request = require('supertest');
const app = require('../app');
const User = require('../models/user.model');
const Stock = require('../models/stock.model');
const StockListCache = require('../models/stockListCache.model');


jest.mock('mongoose', () => {
    const actualMongoose = jest.requireActual('mongoose');
    return {
        ...actualMongoose,
        connect: jest.fn().mockResolvedValue({}),
    };
});

// Mock the User,stock, stocklistcache model module so that we can test with mock data
// Can mock the functions to further test responses
// Mock the user functionality such as save
jest.mock('../models/user.model');
jest.mock('../models/stock.model');
jest.mock('../models/stockListCache.model');
// Mock express-session middleware with conditional control
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

describe('Login, Register, Dashboard, Logout Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // Test for missing fields
    test('POST /register returns 400 if fields are missing', async () => {
        const res = await request(app).post('/register').send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/required/i);
    });
    // Test for invalid email
    test('POST /register returns 400 if email isnt valid', async () => {
        const res = await request(app).post('/register').send({username: 'testuser', email: 'test@examplecom', password: 'password123'});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Please enter a valid email address/i);
    });
    // Test for invalid password
    test('POST /register returns 400 if password isnt valid', async () => {
        const res = await request(app).post('/register').send({username: 'testuser', email: 'test@example.com', password: 'passwo'});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Password must be at least 8 characters/i);
    });
    // Test for succussful user and correct DB info being saved
    test('POST /register creates user successfully', async () => {
        // Mock the User save function
        const mockSave = jest.fn().mockResolvedValue({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123',
            portfolio: { availableFunds: 1000, stocks: [] },
        });
        // Call the save function
        User.mockImplementation(() => ({ save: mockSave }));

        const res = await request(app)
        .post('/register')
        .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

        expect(mockSave).toHaveBeenCalled();
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/Registration successful/i);
    });
    // Test for email being associated with an account
    test('POST /login returns 401 if user not found', async () => {
        // No user found with that email scenario
        User.findOne.mockResolvedValue(null);

        const res = await request(app)
        .post('/login')
        .send({ email: 'test@email.com', password: 'password' });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Email not associated/i);
    });
    // Test that password matches with what is in DB corresponding to Email
    test('POST /login returns 401 if password incorrect', async () => {
        // A user exists but passwords dont match
        User.findOne.mockResolvedValue({
            username: 'testuser',
            email: 'test@email.com',
            password: 'password',
        });

        const res = await request(app)
        .post('/login')
        .send({ email: 'test@email.com', password: 'wrongPassword' });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Incorrect password/i);
    });
    // Test correct email and password match found in DB sends user to Dashboard
    test('POST /login succeeds with valid credentials', async () => {
        const mockSave = jest.fn().mockResolvedValue(true);
        User.findOne.mockResolvedValue({
            username: 'testuser',
            email: 'test@email.com',
            password: 'password123',
            // Make lastLoginBonus old so bonus branch could run if code checks it
            lastLoginBonus: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            portfolio: { availableFunds: 0, stocks: [] },
            save: mockSave,
        });

        const res = await request(app)
        .post('/login')
        .send({ email: 'test@email.com', password: 'password123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.redirect).toBe('/dashboard');
    });

    test('GET /dashboard redirects to / when no session', async () => {
        const res = await request(app).get('/dashboard').set('_forcenosessionuser', 'true');
        expect([302, 301]).toContain(res.status);
        expect(res.headers.location).toBe('/');
    });

    test('GET /dashboard returns page when session present', async () => {
        const res = await request(app).get('/dashboard');
        expect([200,304]).toContain(res.status);
    });

    test('POST /logout clears session and returns success', async () => {
        // ensure User.findOne returns a user with save so logout can persist funds
        const mockUser = { portfolio: { availableFunds: 100 }, currentLoginTime: Date.now() - 60000, save: jest.fn().mockResolvedValue(true) };
        User.findOne.mockResolvedValue(mockUser);
        const res = await request(app).post('/logout');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/Logged out/i);
    });
});
// Test for buy and sell API scenarios
describe('Buying/Selling Routes', () => {
    beforeEach(() => jest.clearAllMocks());
    // Test for user not logged in trying to buy
    test('POST /api/buyStock returns 401 if not logged in', async () => {
        const res = await request(app)
        .post('/api/buyStock')
        .set('_forcenosessionuser', 'true')
        .send({ ticker: 'AAPL', price: 100, quantity: 2 });

        expect(res.status).toBe(401);
    });
    // Test for logged in user with insufficient funds
    test('POST /api/buyStock returns 400 if not enough funds in account', async () => {
        const mockUser = {
            portfolio: { availableFunds: 100, stocks: [] },
            save: jest.fn().mockResolvedValue(true),
        };

        User.findOne.mockResolvedValue(mockUser);

        const res = await request(app)
        .post('/api/buyStock')
        .send({ ticker: 'AAPL', price: 100, quantity: 5 });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Insufficient funds/i);
    });
    // Test for succussful buy transaction
    test('POST /api/buyStock returns success if user has funds', async () => {
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
    // Test for aggreagation in stocks already owned
    test('POST /api/buyStock returns success if user has funds', async () => {
        const mockUser = {
            portfolio: { availableFunds: 1000, stocks: [{ ticker: 'TSLA', avgPrice: 100, quantity: 1 }] },
            save: jest.fn().mockResolvedValue(true),
        };

        User.findOne.mockResolvedValue(mockUser);

        const res = await request(app)
        .post('/api/buyStock')
        .send({ ticker: 'TSLA', price: 100, quantity: 5 });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/Successful buy/i);
        expect(mockUser.portfolio.stocks).toEqual([{ ticker: 'TSLA', avgPrice: 100, quantity: 6 }]);
        expect(mockUser.save).toHaveBeenCalled();
    });
    // Test for user not logged in
    test('POST /api/sellStock returns 401 if not logged in', async () => {
        const res = await request(app)
        .post('/api/sellStock')
        .set('_forcenosessionuser', 'true')
        .send({ ticker: 'TSLA', price: 200, quantity: 1 });

        expect(res.status).toBe(401);
    });
    // Test for selling for a user not in DB
    test('POST /api/sellStock returns 404 if user not found', async () => {
        User.findOne.mockResolvedValue();
        const res = await request(app)
        .post('/api/sellStock')
        .send({ ticker: 'TSLA', price: 200, quantity: 1 });

        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/User not found/i);
    });
    // Test for if user has that no stock to sell
    test('POST /api/sellStock returns 400 if no stocks to sell', async () => {
        const mockUser = {
            portfolio: { availableFunds: 1000, stocks: [] },
            save: jest.fn().mockResolvedValue(true),
        };

        User.findOne.mockResolvedValue(mockUser);

        const res = await request(app)
        .post('/api/sellStock')
        .send({ ticker: 'TSLA', price: 200, quantity: 1 });

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Not enough stock to sell/i);
    });
    // Test for user not logged in trying to sell
    test('POST /api/sellStock returns 401 if not logged in', async () => {
        const mockUser = {
            portfolio: { availableFunds: 1000, stocks: [{ticker: "TSLA", quantity: 1, avgPrice: 200}] },
            save: jest.fn().mockResolvedValue(true),
        };

        User.findOne.mockResolvedValue(mockUser);

        const res = await request(app)
        .post('/api/sellStock')
        .send({ ticker: 'TSLA', price: 200, quantity: 1 });

        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/Successful sell/i);
    });
});

describe('testing funds, user, stocks, search, quote, stockList, updatePrice, watchlist, transactions routes', () => {
    // Set neccessary mocks for fetch, save, and find method for models
    beforeEach(() => {
        jest.clearAllMocks();
        // Provide default fetch stub for tests that don't need it
        fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
        // Ensure model helper functions exist as jest mocks so we can control responses
        Stock.findOne = jest.fn();
        Stock.findOneAndUpdate = jest.fn().mockResolvedValue({});
        StockListCache.findOne = jest.fn();
        StockListCache.mockImplementation = StockListCache.mockImplementation || jest.fn();
    });
    // No session
    test('GET /api/getFunds returns 401 if user not logged in', async () => {
        const res = await request(app).get('/api/getFunds').set('_forcenosessionuser','true');
        expect(res.status).toBe(401);
    });
    // No user
    test('GET /api/getFunds returns 404 if user does not exist', async () => {
        User.findOne.mockResolvedValue(null);
        const res = await request(app).get('/api/getFunds');
        expect(res.status).toBe(404);
    });
    // Returns appropritate user data
    test('GET /api/getFunds returns user availableFunds when logged in', async () => {
        User.findOne.mockResolvedValue({ portfolio: { availableFunds: 1000 }});
        const res = await request(app).get('/api/getFunds');
        expect(res.status).toBe(200);
        expect(res.body.availableFunds).toBe(1000);
    });
    // No session
    test('GET /api/user returns 401 if user not logged in', async () => {
        const res = await request(app).get('/api/user').set('_forcenosessionuser','true');
        expect(res.status).toBe(401);
    });
    // No user
    test('GET /api/user returns 404 if user doesnt exist', async () => {
        User.findOne.mockResolvedValue(null);
        const res = await request(app).get('/api/user');
        expect(res.status).toBe(404);
    });
    // Data returned
    test('GET /api/user returns logged in users username and portfolio', async () => {
        User.findOne.mockResolvedValue({ username: 'testuser', portfolio: { availableFunds: 1000, stocks: [], realizedGainLoss: 0 } });
        const res = await request(app).get('/api/user');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.username).toBe('testuser');
        expect(res.body.portfolio).toBeDefined();
    });
    // No session
    test('GET /api/getStocks returns 401 if user not logged in', async () => {
        const res = await request(app).get('/api/getStocks').set('_forcenosessionuser','true');
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Not logged in");
    });
    // Data returned
    test('GET /api/getStocks returns funds and stocks', async () => {
        User.findOne.mockResolvedValue({ portfolio: { availableFunds: 1000, stocks: [{ ticker: 'FOO' }], realizedGainLoss: 0 } });
        const res = await request(app).get('/api/getStocks');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.availableFunds).toBe(1000);
        expect(Array.isArray(res.body.stocks)).toBe(true);
    });
    // Failed API call
    test('GET /api/search/:ticker returns 500 if Alpha Vantage resoponse fails', async () => {
        fetch.mockResolvedValueOnce({ ok: false });
        const res = await request(app).get('/api/search/FOO');
        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Error performing search");
    });
    // Data returns API data in response
    test('GET /api/search/:ticker returns bestMatches', async () => {
        const stockListMatches = { bestMatches: [{ '1. symbol': 'FOO' }] };
        fetch.mockResolvedValueOnce({ ok: true, json: async () => stockListMatches });
        const res = await request(app).get('/api/search/FOO');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.bestMatches)).toBe(true);
        expect(res.body.bestMatches[0]['1. symbol']).toBe('FOO');
    });
    // Data returned is from DB if fresh
    test('GET /api/quote/:ticker returns cached DB quote when fresh', async () => {
        const recent = new Date(Date.now());
        Stock.findOne.mockResolvedValue({ symbol: 'FOO', open: 10.00, high: 11.50, low: 8.00, price: 10.15, change_amount: 0.50, change_percent: '5%', lastRefresh: recent });
        const res = await request(app).get('/api/quote/FOO');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.quote['01. symbol']).toBe('FOO');
        expect(res.body.quote['05. price']).toBe('10.15');
    });
    // API call data is saved to DB and returned
    test('GET /api/quote/:ticker gets,saves quote in DB and returns quote', async () => {
        Stock.findOne.mockResolvedValue(null);
        const alphaResponseData = { 'Global Quote': { '01. symbol': 'FOO', '02. open': '10.00', '03. high': '11.00', '04. low': '8.00', '05. price': '10.50', '09. change': '0.50', '10. change percent': '5%' } };
        fetch.mockResolvedValueOnce({ ok: true, json: async () => alphaResponseData });
        Stock.findOneAndUpdate = jest.fn().mockResolvedValue({});

        const res = await request(app).get('/api/quote/FOO');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.quote['01. symbol']).toBe('FOO');
        expect(Stock.findOneAndUpdate).toHaveBeenCalled();
    });
    // DB data returned if fresh
    test('GET /api/stockList returns DB data when data is less than 24 hours old', async () => {
        const recent = new Date(Date.now());
        StockListCache.findOne.mockResolvedValue({ data: { FOO: 1 }, lastRefresh: recent });
        const res = await request(app).get('/api/stockList');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.stockList).toEqual({ FOO: 1 });
    });
    // API data is saved to DB and returmed
    test('GET /api/stockList makes API call and saves data to DB then returns data', async () => {
        StockListCache.findOne.mockResolvedValue(null);
        const stockList = { top_gainers: [{ ticker: 'FOO', price: 10.00, change_amount: 0.00, change_percentage: '0' }] };
        fetch.mockResolvedValueOnce({ ok: true, json: async () => stockList });
        
        StockListCache.mockImplementation(() => ({ save: jest.fn().mockResolvedValue(true) }));
        Stock.findOneAndUpdate = jest.fn().mockResolvedValue({});

        const res = await request(app).get('/api/stockList');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.stockList).toEqual(stockList);
    });
    // Data retuned
    test('POST /api/updatePrice updates stock avgPrice and returns success', async () => {
        const mockUser = { portfolio: { stocks: [{ ticker: 'FOO', avgPrice: 10.00 } ] }, save: jest.fn().mockResolvedValue(true) };
        User.findOne.mockResolvedValue(mockUser);
        const res = await request(app).post('/api/updatePrice').send({ ticker: 'FOO', price: 10.00 });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockUser.save).toHaveBeenCalled();
    });
    // Data returned
    test('GET /api/user/watchlist returns watchlist for logged in user', async () => {
        User.findOne.mockResolvedValue({ watchlist: { stocks: [{ ticker: 'FOO' }] } });
        const res = await request(app).get('/api/user/watchlist');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.watchlist)).toBe(true);
    });
    // No session
    test('POST /api/user/addWatchlistItem returns 401 when not logged in', async () => {
        const res = await request(app).post('/api/user/addWatchlistItem').set('_forcenosessionuser','true').send({ ticker: 'B' });
        expect(res.status).toBe(401);
    });
    // Item added to User in DB
    test('POST /api/user/addWatchlistItem adds ticker when present', async () => {
        const mockUser = { watchlist: { stocks: [] }, save: jest.fn().mockResolvedValue(true) };
        User.findOne.mockResolvedValue(mockUser);
        const res = await request(app).post('/api/user/addWatchlistItem').send({ ticker: 'FOO' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(mockUser.save).toHaveBeenCalled();
        expect(Array.isArray(res.body.watchlist)).toBe(true);
    });
    // Item deleted in User DB
    test('DELETE /api/user/watchlist/:ticker removes ticker when present', async () => {
        const mockUser = { watchlist: { stocks: [{ ticker: 'FOO' }] }, save: jest.fn().mockResolvedValue(true) };
        User.findOne.mockResolvedValue(mockUser);
        const res = await request(app).delete('/api/user/watchlist/FOO');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/Removed FOO/);
    });
    // No seesion
    test('GET /api/transactions returns 401 when not logged in', async () => {
        const res = await request(app).get('/api/transactions').set('_forcenosessionuser','true');
        expect(res.status).toBe(401);
    });
    // Transaction array returned is correctly filtered and sorted based
    // on param given
    test('GET /api/transactions returns transactions filtered and sorted', async () => {
        const transaction = [
            { type: 'buy', timestamp: new Date(Date.now() - 1000) },
            { type: 'sell', timestamp: new Date(Date.now()) },
        ];
        User.findOne.mockResolvedValue({ transactions: transaction });
        // Test all transaction returned
        let res = await request(app).get('/api/transactions');
        expect(res.status).toBe(200);
        expect(res.body.transactions.length).toBe(2);
        
        // Test only buy transaction returned
        res = await request(app).get('/api/transactions').query({ type: 'buy' });
        expect(res.status).toBe(200);
        expect(res.body.transactions.every(t => t.type === 'buy')).toBe(true);
        // Test only sell transaction returned
        res = await request(app).get('/api/transactions').query({ type: 'sell' });
        expect(res.status).toBe(200);
        expect(res.body.transactions.every(t => t.type === 'sell')).toBe(true);
        // Test transactions sorting matches query params
        res = await request(app).get('/api/transactions').query({ sort: 'oldest' });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.transactions)).toBe(true);
    });
});
