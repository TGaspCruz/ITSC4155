// Basic search (Requires further implementation)
function searchStock() {
    const ticker = document.getElementById("ticker").value.toUpperCase();
    if (ticker) {
        alert("Searching for " + ticker + "...");
    } else {
        alert("Please enter a stock ticker.");
    }
}
// Basic form display(Requires further implementation)
function showForm(type) {
    document.getElementById("form-title").textContent = type === "buy" ? "Buy Stock" : "Sell Stock";
    document.getElementById("trade-form").style.display = "block";
}

function closeForm() {
    document.getElementById("trade-form").style.display = "none";
}

// Basic logout (Requires further implementation)
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
    const response = await fetch('/logout', { method: 'POST' });
    // ignore response and redirect to login (Testing Logout)
    window.location.href = '/';
    } catch (err) {
    console.error('Logout failed', err);
    window.location.href = '/';
    }
});

// Fetch data from the server and populate tables
async function fetchStockData() {
    try {
        const response = await fetch('/api/stockList');
        const data = await response.json();
        
        const gainersTable = document.getElementById('TopGainerTable');
        const losersTable = document.getElementById('TopLosersTable');
        const activeTable = document.getElementById('TopActivelyTraded');

        // Function to populate a table with stock data
        function populateTable(stocks, table) {
            let html = '<tr><th>Ticker</th><th>Price</th><th>Change</th><th>Change%</th><th>Volume</th></tr>';
            stocks.forEach(stock => {
                html += `<tr>
                            <td>${stock.ticker}</td>
                            <td>$${Number(stock.price).toFixed(2)}</td>
                            <td style="color:${Number(stock.change_amount).toFixed(2) >= 0 ? 'green' : 'red'};">
                                ${Number(stock.change_amount).toFixed(2) >= 0 ? '+' : ''}${Number(stock.change_amount).toFixed(2)}
                            </td>
                            <td style="color:${Number(stock.change_amount).toFixed(2) >= 0 ? 'green' : 'red'};">
                                ${stock.change_percentage}
                            <td>${stock.volume}</td>
                            </tr>`;
            });
            table.innerHTML = html;
        }
        const top_gainersArray = data.stockList.top_gainers;
        const top_losersArray = data.stockList.top_losers;
        const most_actively_tradedArray = data.stockList.most_actively_traded;

        populateTable(top_gainersArray, gainersTable);
        populateTable(top_losersArray, losersTable);
        populateTable(most_actively_tradedArray, activeTable);

    } catch (error) {
        console.error('Error fetching stock data:', error);
    }
}

// Fetch stock data on page load
//window.onload = fetchStockData;