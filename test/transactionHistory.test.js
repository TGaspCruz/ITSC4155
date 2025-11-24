/**
 * @jest-environment jsdom
 */

describe('transactionHistory module', () => {
    let module;
    beforeEach(() => {
        // Mock DOM needed to test
        document.body.innerHTML = `
        <div class="filters">
            <button class="filter-btn active" data-type="all">All</button>
            <button class="filter-btn" data-type="buy">Buy</button>
            <button class="filter-btn" data-type="sell">Sell</button>
        </div>
        <select id="sortDropdown"><option value="newest">Newest</option></select>
        <table><tbody id="transaction-body"></tbody></table>
        `;
        jest.resetModules();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        module = require('../public/transactionHistory');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('fetchTransactions returns users transactions on success', async () => {
        // mock server response data
        const returnedTransactions = [{ timestamp: Date.now(), ticker: 'FOO', type: 'buy', quantity: 2, price: 5.00, total: 10.00 }];
        fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, transactions: returnedTransactions }) });
        
        const res = await module.fetchTransactions('all', 'newest');

        expect(fetch).toHaveBeenCalledWith('/api/transactions?type=all&sort=newest');
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBe(1);
        expect(res[0].ticker).toBe('FOO');
    });

    test('fetchTransactions returns empty array if response is bad', async () => {
        fetch = jest.fn().mockResolvedValue({ ok: false });
        const res = await module.fetchTransactions('buy', 'oldest');
        expect(res).toEqual([]);
    });

    test('renderTransactions shows correct message with no transactions made', () => {
        module.renderTransactions([]);
        const tbody = document.getElementById('transaction-body');
        expect(tbody.childNodes.length).toBe(1);
        expect(tbody.textContent).toContain('You have no transactions yet.');
    });

    test('renderTransactions renders rows for transactions', () => {
        const transaction = { timestamp: new Date().toISOString(), ticker: 'FOO', type: 'buy', quantity: 3, price: 2.50, total: 7.50 };
        module.renderTransactions([transaction]);
        const tbody = document.getElementById('transaction-body');
        expect(tbody.childNodes.length).toBe(1);
        const rowText = tbody.firstChild.textContent;
        expect(rowText).toContain('FOO');
        expect(rowText).toContain('buy');
        expect(rowText).toContain('3');
        expect(rowText).toContain('$2.50');
        expect(rowText).toContain('$7.50');
    });
});
