/**
 * @jest-environment jsdom
 */
describe('watchlist functions', () => {
    let module;
    beforeEach(() => {
        document.body.innerHTML = `
        <input id="input-box" />
        <div class="stocks-container"></div>
        <button id="searchButton"></button>
        `;
        jest.resetModules();
        jest.spyOn(window, 'alert').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        module = require('../public/watchlist');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('fetchCurrentPrices returns parsed prices and changes', async () => {
        fetch = jest.fn((url) => {
            if (url === '/api/quote/FOO') {
                return Promise.resolve({ ok: true, json: async () => ({ success: true, quote: { '05. price': '3.50', '09. change': '0.20' } }) });
            }
        });

        const res = await module.fetchCurrentPrices([{ ticker: 'FOO' }]);
        expect(res.stockPrices.FOO).toBeCloseTo(3.5);
        expect(res.stockChanges.FOO).toBeCloseTo(0.2);
        expect(global.fetch).toHaveBeenCalledWith('/api/quote/FOO');
    });

    test('updateWatchList appends a stock item to DOM', async () => {
        const currentPrices = { stockPrices: { FOO: 4.2 }, stockChanges: { FOO: 1.1 } };
        await module.updateWatchList('FOO', currentPrices);
        const container = document.querySelector('.stocks-container');
        expect(container.childNodes.length).toBe(1);
        expect(container.textContent).toContain('FOO');
        expect(container.textContent).toContain('$4.20');
    });

    test('loadWatchlist populates stocks from API', async () => {
        fetch = jest.fn((url) => {
            if (url === '/api/user/watchlist') {
                return Promise.resolve({ ok: true, json: async () => ({ success: true, watchlist: [{ ticker: 'FOO' }] }) });
            }
            if (url === '/api/quote/FOO') {
                return Promise.resolve({ ok: true, json: async () => ({ success: true, quote: { '05. price': '6.00', '09. change': '0.5' } }) });
            }
        });

        await module.loadWatchlist();
        const container = document.querySelector('.stocks-container');
        expect(container.childNodes.length).toBe(1);
        expect(container.textContent).toContain('FOO');
    });

    test('deleteWatchListItem removes element on success', async () => {
        // Build a DOM element structure that deleteWatchListItem expects
        document.body.innerHTML = `<button id="searchButton"></button><div class="stocks-container"><div class="stock-item"><div class="stock-symbol">FOO</div><div class="delete-x">X</div></div></div>`;
        const deleteBtn = document.querySelector('.delete-x');
        fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, watchlist: [] }) });

        await module.deleteWatchListItem({ currentTarget: deleteBtn });
        const container = document.querySelector('.stocks-container');
        expect(container.childNodes.length).toBe(0);
    });

    test('addWatchlistItem posts and updates DOM on success', async () => {
        document.getElementById('input-box').value = 'FOO';

        // Mock fetch response data first call for quote, second call for addWatchlistItem
        fetch = jest.fn((url, opts) => {
            if (url === '/api/quote/FOO') {
                return Promise.resolve({ ok: true, json: async () => ({ success: true, quote: { '05. price': '4.20', '09. change': '1.1' } }) });
            }
            if (url === '/api/user/addWatchlistItem') {
                return Promise.resolve({ ok: true, json: async () => ({ success: true, watchlist: [{ ticker: 'FOO' }] }) });
            }
        });

        const module = require('../public/watchlist');

        await module.addWatchlistItem();

        expect(fetch).toHaveBeenCalledWith('/api/quote/FOO');
        expect(fetch).toHaveBeenCalledWith('/api/user/addWatchlistItem', expect.any(Object));
        const container = document.querySelector('.stocks-container');
        expect(container.textContent).toContain('FOO');
        expect(container.textContent).toContain('$4.20');
        expect(document.getElementById('input-box').value).toBe('');
    });

    test('addWatchlistItem alerts when ticker not found', async () => {
        document.getElementById('input-box').value = 'AAAAA';
        // quote fetch returns success:false so fetchCurrentPrices will have no prices
        fetch = jest.fn((url) => {
            if (url.startsWith('/api/quote/')) {
                return Promise.resolve({ ok: true, json: async () => ({ success: false }) });
            }
        });

        const module = require('../public/watchlist');
        await module.addWatchlistItem();

        expect(document.getElementById('input-box').value).toBe('');
    });
});
