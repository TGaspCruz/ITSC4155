const searchBtn = document.getElementById("searchBtn");
const tickerInput = document.getElementById("ticker");
const searchedTickerPrice = document.getElementById("searchedTickerPrice");
const stockTicker = document.getElementById("hiddenTicker");
const stockPrice = document.getElementById("hiddenPrice");
const availableFundsBuy = document.getElementById("available-funds-buy");
let usersAvailableFunds = 0;

async function showForm(type) {
    document.getElementById("form-title").textContent = type === "buy" ? "Buy Stock" : "Sell Stock";
    document.getElementById("trade-form").style.display = "block";
}

function closeForm() {
  document.getElementById("trade-form").style.display = "none";
  document.getElementById("buyButton").style.display = "block";
}


searchBtn.addEventListener('click', handleSearchButtonClick);

async function handleSearchButtonClick() {
    try {
        const ticker = tickerInput.value.toUpperCase();
        console.log(ticker);
        if (!ticker || ticker.length === 0 || ticker == "" || ticker.trim().length === 0) {
            alert("Enter a ticker symbol");
            return;
        }
        // Real implementation
        const response = await fetch(`/api/quote/${ticker}`);
        if (!response.ok) {
            throw new Error(`AlphaVantage HTTP ${response.status}`);
        }
        const stockData = await response.json();
        console.log(stockData);
        console.log(!stockData);
        console.log(!stockData.success);
        if (!stockData || !stockData.success) {
            alert(`${stockData.message}`);
            return;
        }
        console.log(stockData);
        searchedTickerPrice.innerText = `Ticker: ${stockData.quote["01. symbol"]} Price: ${parseFloat(stockData.quote["05. price"]).toFixed(2)}
                                        High: ${parseFloat(stockData.quote["03. high"]).toFixed(2)} Low: ${parseFloat(stockData.quote["04. low"]).toFixed(2)}`;
        const availableFundsResponse = await fetch('api/getFunds');
        if (!availableFundsResponse.ok) {
            throw new Error(`Unable to make recieve funds`);
        }
        const availableFundsJson = await availableFundsResponse.json();
        availableFundsBuy.textContent = `Available Funds: $${availableFundsJson.availableFunds.toFixed(2)}`;
        usersAvailableFunds = availableFundsJson.availableFunds.toFixed(2);
        showForm("buy");
        // Set hidden input values for form submission
        stockTicker.value = stockData.quote["01. symbol"];
        stockPrice.value = parseFloat(stockData.quote["05. price"]).toFixed(2);
    } catch (error) {
        console.error('Error fetching stock data:', error);
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

document.getElementById('trade-form')?.addEventListener('submit', (e) => handleBuyFormSubmit(e));

async function handleBuyFormSubmit(event) {
    event.preventDefault();
    const qty = Number(document.getElementById('quantity').value);
    const price = Number(document.getElementById('hiddenPrice').value);
    const ticker = document.getElementById('hiddenTicker').value;
    const buyMessage = document.getElementById('trade-message');
    buyMessage.textContent = '';

    if (!ticker || !price || !qty || qty <= 0) {
        buyMessage.style.color = 'red';
        buyMessage.textContent = 'Invalid buy parameters';
        return;
    }

    try {
        const resp = await fetch('/api/buyStock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, price, quantity: qty })
        });
        const payload = await resp.json();
        if (!resp.ok || !payload.success) {
            buyMessage.style.color = 'red';
            buyMessage.textContent = payload.message;
            return;
        }
        buyMessage.style.color = 'green';
        buyMessage.textContent = 'Purchase successful';
        availableFundsBuy.textContent = `Available Funds: $${payload.availableFunds.toFixed(2)}`;
    } catch (err) {
        console.error('Buy request failed', err);
        buyMessage.style.color = 'red';
        buyMessage.textContent = 'Network error during purchase';
    }
}

async function fetchStockData() {
    try {
        const response = await fetch('/api/stockList');
        if (!response.ok) {
            throw new Error(`AlphaVantage HTTP ${searchResponse.status}`);
        }
        const data = await response.json();
        console.log(data);
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
                            <td style="color:${
                              Number(stock.change_amount).toFixed(2) >= 0
                                ? "green"
                                : "red"
                            };">
                                ${
                                  Number(stock.change_amount).toFixed(2) >= 0
                                    ? "+"
                                    : ""
                                }${Number(stock.change_amount).toFixed(2)}
                            </td>
                            <td style="color:${
                              Number(stock.change_amount).toFixed(2) >= 0
                                ? "green"
                                : "red"
                            };">
                                ${parseFloat(stock.change_percentage).toFixed(2)}%
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

const tablinks = document.getElementsByClassName("stock-tab");
const tablinksArray = Array.from(tablinks); 
const tabcontent = document.getElementsByClassName("stock-table");
const tabContentArray = Array.from(tabcontent);
tablinksArray.forEach((tab, index) => {
    tab.addEventListener('click', (e) => openTab(e, index))
});

function openTab(evt, index) {
  const currentActiveTab = document.querySelector(".stock-tab.active");
  const currentActiveTable = document.querySelector(".stock-table.active");
    currentActiveTab.classList.toggle("active");
    currentActiveTable.classList.toggle("active");

    tablinksArray[index].classList.toggle("active");
    tabContentArray[index].classList.toggle("active");
}

window.onload = fetchStockData;

module.exports = { fetchStockData, handleBuyFormSubmit, handleSearchButtonClick};
