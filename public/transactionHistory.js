document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        await loadAndRender();
    });
});

const sort = document.getElementById('sortDropdown');
sort.addEventListener('change', loadAndRender);

async function loadAndRender(){
    const sort = document.getElementById('sortDropdown').value;
    const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-type');
    const transactions = await fetchTransactions(activeFilter, sort);
    renderTransactions(transactions);
}

async function fetchTransactions(type, sort){
    try {
        const params = new URLSearchParams();
        params.set('type', type);
        params.set('sort', sort);
        const res = await fetch('/api/transactions?' + params.toString());
        if (!res.ok) {
            throw new Error('Failed to fetch transactions');
        }
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        return data.transactions;
    } catch (err) {
        console.error('Error fetching transactions:', err);
        return [];
    }
}

function renderTransactions(transactions){
    const tbody = document.getElementById('transaction-body');
    tbody.innerHTML = '';
    if (!transactions || transactions.length === 0){
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6">You have no buy transactions yet.</td>';
        tbody.appendChild(tr);
        return;
    }

    for (const transaction of transactions){
        const tr = document.createElement('tr');
        const date = new Date(transaction.timestamp).toLocaleString();
        const total = ((Number(transaction.total)) * Number(transaction.quantity || 0)).toFixed(2);
        tr.innerHTML = `
            <td>${date}</td>
            <td>${transaction.ticker}</td>
            <td>${transaction.type}</td>
            <td>${transaction.quantity}</td>
            <td>$${Number(transaction.price).toFixed(2)}</td>
            <td>$${total}</td>
        `;
        tbody.appendChild(tr);
    }
}

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
    const response = await fetch('/logout', { method: 'POST' });
    // ignore response and redirect to login (Testing Logout)
    const responseJson = await response.json();
    setTimeout(() => { window.location.href = responseJson.redirect; }, 300);
    } catch (err) {
        console.error('Logout failed', err);
        window.location.href = '/';
    }
});

loadAndRender()


module.exports = { fetchTransactions, renderTransactions, loadAndRender };
