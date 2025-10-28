/**
 * @jest-environment jsdom
 */
describe('portfolio loadPortfolio function', () => {
    // Make Mock DOM for Jest Enviroment and set mock response console.error
    beforeEach(() => {
        // Mock HTML Elements to test content changes
        document.body.innerHTML = `
        <h1 id="username"></h1>
        <div id="available-funds"></div>
        <div id="total-invested"></div>
        <table>
            <tbody id="holdings-body"></tbody>
        </table>
        <button id="logoutBtn"></button>
        `;
        jest.resetModules();
        // Lets the test run without worrying about console.error 
        // console.error is part of our js code that catches thrown errors
        // We dont really care about testing the function
        // We mock the results to test for fetch failures
        jest.spyOn(console, 'error').mockImplementation(() => {});
  });

    afterEach(() => {
        jest.clearAllMocks();
    });
    // Test that when user has no stocks, the table 
    test('shows no holdings when stocks empty', async () => {
        // Mock the API JSON data returned from our API 
        const mockUser = {
            success: true,
            username: 'alice',
            portfolio: { availableFunds: 100.5, stocks: [] }
        };
        // Mock the fetch response needed for porfolio to load data
        fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockUser });

        const modules = require('../public/portfolio');
        await modules.loadPortfolio();
        // Real user with no stocks have different content in HTML elements
        expect(document.getElementById('username').textContent).toBe("alice's Portfolio");
        expect(document.getElementById('available-funds').textContent).toBe('$100.50');
        expect(document.getElementById('total-invested').textContent).toBe('$0.00');
        const tbody = document.getElementById('holdings-body');
        expect(tbody.childNodes.length).toBe(1);
        expect(tbody.textContent).toContain('No Stock holdings');
    });

    test('stocks are shown if User owns stock', async () => {
        // Mock the API JSON data returned from our API 
        const mockUser = {
            success: true,
            username: 'bob',
            portfolio: {
                availableFunds: 42,
                stocks: [ { ticker: 'FOO', quantity: 2, avgPrice: 10.0 } ]
            }
        };
        // Mock the fetch response needed for porfolio to load data
        fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockUser });

        const modules = require('../public/portfolio');
        await modules.loadPortfolio();
        // Check element changes are made after JSON data is returned from server
        expect(document.getElementById('username').textContent).toBe("bob's Portfolio");
        expect(document.getElementById('available-funds').textContent).toBe('$42.00');
        const tbody = document.getElementById('holdings-body');
        expect(tbody.childNodes.length).toBe(1);
        const firstRow = tbody.firstChild;
        expect(firstRow.textContent).toContain('FOO');
        expect(firstRow.textContent).toContain('2');
        expect(firstRow.textContent).toContain('$10.00');
        expect(document.getElementById('total-invested').textContent).toBe('$20.00');
    });

    test('user session not set sends to login page', async () => {
        fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

        const modules = require('../public/portfolio');
        await modules.loadPortfolio();

        expect(window.location.pathname).toBe('/');
    });

    test('server request failures', async () => {
        fetch = jest.fn().mockRejectedValue(new Error('network'));

        const modules = require('../public/portfolio');
        await modules.loadPortfolio();

        const tbody = document.getElementById('holdings-body');
        expect(tbody.textContent).toContain('Error loading portfolio');
    });
});
