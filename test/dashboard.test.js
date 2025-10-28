/**
 * @jest-environment jsdom
 */
describe('dashboard.js', () => {
    // Make Mock DOM for Jest Enviroment and set mock response for window.alert and console.error
    beforeEach(() => {
        // Our mock HTML elements to check for changes in text content
        document.body.innerHTML = `
        <table id="TopGainerTable"></table>
        <table id="TopLosersTable"></table>
        <table id="TopActivelyTraded"></table>
        <input id="ticker"/>
        <button id="searchBtn"></button>
        <div id="searchedTickerPrice"></div>
        <h3 id="form-title"></h3>
        <form id="trade-form">
            <input id="quantity"/>
            <p id="available-funds-buy"></p>
            <input id="hiddenTicker"/>
            <input id="hiddenPrice"/>
            <p id="trade-message"></p>
        </form>
        `;

        jest.resetModules();
        // We are not worried about testing these functions
        // Give empty implementation to move on with test
        jest.spyOn(window, 'alert').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
    // Returned Data should set up HTML element content
    test('fetchStockData populates tables from server stockList', async () => {
        const fetchResponse = {
            stockList: {
                top_gainers: [ { ticker: 'test1', price: '1.23', change_amount: '0.5', change_percentage: '+0.50%', volume: '1000' } ],
                top_losers: [{ ticker: 'test2', price: '40.78', change_amount: '5.0', change_percentage: '-0.50%', volume: '1000' }],
                most_actively_traded: [{ ticker: 'test3', price: '450.78', change_amount: '3.5', change_percentage: '+0.50%', volume: '1000' }]
            }
        };
        // Mock the fetch response from our server
        // fetchStockData proceeds differently according to response
        fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => fetchResponse });

        const dashboard = require('../public/dashboard');
        await dashboard.fetchStockData();

        const gainers = document.getElementById('TopGainerTable');
        const losers = document.getElementById('TopLosersTable');
        const active = document.getElementById('TopActivelyTraded');
        expect(gainers.innerHTML).toContain('test1');
        expect(gainers.innerHTML).toContain('$1.23');
        expect(gainers.innerHTML).toContain('+0.50');
        expect(losers.innerHTML).toContain('test2');
        expect(losers.innerHTML).toContain('$40.78');
        expect(losers.innerHTML).toContain('-0.50');
        expect(active.innerHTML).toContain('test3');
        expect(active.innerHTML).toContain('$450.78');
        expect(active.innerHTML).toContain('+0.50');
    });
    // Testing search event listener to populate HTML content when valid
    test('handleSearchButtonClick fetches quote and funds and populates form', async () => {
        // mock value in ticker input
        document.getElementById('ticker').value = 'foo';
        // Handle fetch responses with mock data dependent in API call
        fetch = jest.fn((url) => {
            if (url.startsWith('/api/quote/')) {
                return Promise.resolve({ ok: true, json: async () => ({ success: true, quote: {
                    '01. symbol': 'FOO', '05. price': '2.50', '03. high': '3.00', '04. low': '2.00'
                } }) });
            }
            if (url === 'api/getFunds') {
                return Promise.resolve({ ok: true, json: async () => ({ availableFunds: 123.45 }) });
            }
        });

        const dashboard = require('../public/dashboard');
        await dashboard.handleSearchButtonClick();

        // Fetch calls made inside handleSearchButtonClick function
        expect(fetch).toHaveBeenCalledWith('/api/quote/FOO');
        expect(fetch).toHaveBeenCalledWith('api/getFunds');

        // Check HTML content changes were made
        const searchedTickerPrice = document.getElementById('searchedTickerPrice');
        expect(searchedTickerPrice.innerText).toContain('Ticker: FOO');
        expect(document.getElementById('available-funds-buy').textContent).toContain('$123.45');
        expect(document.getElementById('hiddenTicker').value).toBe('FOO');
        expect(document.getElementById('hiddenPrice').value).toBe('2.50');
        expect(document.getElementById('form-title').textContent).toBe('Buy Stock');
    });
    // Testing valid buy submissions
    test('handleBuyFormSubmit shows success and updates available funds', async () => {
        document.getElementById('hiddenTicker').value = 'FOO';
        document.getElementById('hiddenPrice').value = '2.50';
        document.getElementById('quantity').value = '2';
        // Mock the fetch response
        fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, availableFunds: 50.00 }) });

        const dashboard = require('../public/dashboard');
        const event = { preventDefault: jest.fn() };
        await dashboard.handleBuyFormSubmit(event);

        const tradeMessage = document.getElementById('trade-message');
        expect(tradeMessage.style.color).toBe('green');
        expect(tradeMessage.textContent).toBe('Purchase successful');
        expect(document.getElementById('available-funds-buy').textContent).toContain('$50.00');
    });
    // Testing when inputs are empty
    test('handleBuyFormSubmit response to empty inputs', async () => {
        document.getElementById('hiddenTicker').value = '';
        document.getElementById('hiddenPrice').value = '';
        document.getElementById('quantity').value = '0';
        
        const dashboard = require('../public/dashboard');
        const event = { preventDefault: jest.fn() };
        await dashboard.handleBuyFormSubmit(event);

        const tradeMessage = document.getElementById('trade-message');
        expect(tradeMessage.textContent).toBe('Invalid buy parameters');
        expect(tradeMessage.style.color).toBe('red');
    });
    // Testing invalid buy submission
    test('handleBuyFormSubmit when response is unsuccesful', async () => {
        document.getElementById('hiddenTicker').value = 'FOO';
        document.getElementById('hiddenPrice').value = '2.50';
        document.getElementById('quantity').value = '2';
        // Mock the fetch response
        fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, message: 'Insufficient funds' })});

        const dashboard = require('../public/dashboard');
        const event = { preventDefault: jest.fn() };
        await dashboard.handleBuyFormSubmit(event);

        const tradeMessage = document.getElementById('trade-message');
        expect(tradeMessage.textContent).toBe('Insufficient funds');
        expect(tradeMessage.style.color).toBe('red');
    });
});
