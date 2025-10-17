// Fetch and display logged in user portfolio data
async function loadPortfolio() {
    try {
        const res = await fetch('/api/user');
        if (!res.ok) {
            if (res.status === 401) window.location.href = '/';
            throw new Error(`HTTP ${res.status}`);
        }
        const payload = await res.json();
        if (!payload.success) throw new Error(payload.message || 'API error');

        document.getElementById('username').textContent = `${payload.username}'s Portfolio`;
        document.getElementById('available-funds').textContent = `$${(payload.portfolio.availableFunds || 0).toFixed(2)}`;

        const tbody = document.getElementById('holdings-body');
        tbody.innerHTML = '';
        const stocks = payload.portfolio.stocks || [];
        if (!stocks.length) {
            tbody.innerHTML = '<tr><td colspan="4">No Stock holdings</td></tr>';
            return;
        }
        stocks.forEach(s => {
            const tr = document.createElement('tr');
            const marketValue = s.quantity * (s.avgPrice || 0);
            tr.innerHTML = `
                <td>${s.ticker}</td>
                <td>${s.quantity}</td>
                <td>$${(s.avgPrice || 0).toFixed(2)}</td>
                <td>$${marketValue.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Failed to load portfolio', err);
        document.getElementById('holdings-body').innerHTML = '<tr><td colspan="4">Error loading portfolio</td></tr>';
    }
}

//loadPortfolio();
// logout handler

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await fetch('/logout', { method: 'POST' });
    } catch (err) {
        console.error('Logout failed', err);
    } finally {
        window.location.href = '/';
    }
});