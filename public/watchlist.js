"use strict";
const addButton = document.getElementById("searchButton");

addButton.addEventListener("click", addWatchlistItem);

async function deleteWatchListItem(e) {
    console.log("click");
    const deleteButton = e.currentTarget;
    console.log(deleteButton);
    const stockItem = deleteButton.closest(".stock-item");
    const stockSymbol = stockItem.querySelector(".stock-symbol");
    console.log(stockSymbol);
    const ticker = stockSymbol.textContent;
    console.log(ticker);
    try {
        const response = await fetch(`/api/user/watchlist/${ticker}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();
    if (data.success) {
        console.log(`Successfully removed ${ticker}`, data.watchlist);
        stockItem.remove();
    }
    } catch (err) {
        console.error('Error calling API:', err);
  }

}

async function addWatchlistItem() {
    const input = document.getElementById('input-box').value;
    const ticker = input.toUpperCase();

    if (!ticker) {
        alert("Ticker is required")
        return;
    }
    try {
        const stocksArray = [{ ticker }];
        const currentPrices = await fetchCurrentPrices(stocksArray);
        if (Object.keys(currentPrices.stockPrices).length === 0) {
            alert("Ticker Symbol Not FOund");
            document.getElementById('input-box').value = "";
            return;
        }
        
        const resp = await fetch('/api/user/addWatchlistItem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker })
        });
        const payload = await resp.json();
        console.log(payload.success);
        console.log(!resp.ok);
        document.getElementById('input-box').value = "";
        if (!payload.success) {
            alert(payload.message);
            return;
        }
        updateWatchList(ticker, currentPrices);
    } catch (err) {
        document.getElementById('input-box').value = "";
        alert(payload.message || err.message);
        console.error('Failed to add to watchlist', err);
    }
}

async function updateWatchList(ticker, currentPrices) {
    try {
        const stockContainer = document.querySelector(".stocks-container");
        const stockItem = document.createElement("div");
        stockItem.classList.add("stock-item");
        stockContainer.appendChild(stockItem);
        const stockSymbol = document.createElement("div");
        stockSymbol.classList.add("stock-symbol");
        stockSymbol.textContent = ticker;
        const stockPrice = document.createElement("div");
        stockPrice.classList.add("stock-Price");
        stockPrice.textContent = `$${parseFloat(currentPrices.stockPrices[ticker]).toFixed(2)}`;
        const stockChange = document.createElement("div");
        stockChange.classList.add("stock-change");
        stockChange.textContent = currentPrices.stockChanges[ticker];
        currentPrices.stockChanges[ticker] >= 0 ? stockChange.classList.add("gain") : stockChange.classList.add("loss");
        const deleteX = document.createElement("div");
        deleteX.classList.add("delete-x");
        deleteX.textContent = "X";
        deleteX.addEventListener("click", (e) => deleteWatchListItem(e));
        stockItem.appendChild(stockSymbol);
        stockItem.appendChild(stockPrice);
        stockItem.appendChild(stockChange);
        stockItem.appendChild(deleteX);
    } catch(err) {
        console.error(err);
    }
};

async function loadWatchlist() {
    try {
        const res = await fetch('/api/user/watchlist');
        if (!res.ok) {
            if (res.status === 401) window.location.href = '/';
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!data.success) throw new Error(watchlist.message || 'API error');

        const stockContainer = document.querySelector(".stocks-container");
        const stocks = data.watchlist;

        const currentPrices = await fetchCurrentPrices(stocks);
        
        stocks.forEach(stock => {
            const stockItem = document.createElement("div");
            stockItem.classList.add("stock-item");
            stockContainer.appendChild(stockItem);
            const stockSymbol = document.createElement("div");
            stockSymbol.classList.add("stock-symbol");
            stockSymbol.textContent = stock.ticker;
            const stockPrice = document.createElement("div");
            stockPrice.classList.add("stock-Price");
            stockPrice.textContent = `$${parseFloat(currentPrices.stockPrices[stock.ticker]).toFixed(2)}`;
            const stockChange = document.createElement("div");
            stockChange.classList.add("stock-change");
            stockChange.textContent = currentPrices.stockChanges[stock.ticker];
            currentPrices.stockChanges[stock.ticker] >= 0 ? stockChange.classList.add("gain") : stockChange.classList.add("loss");
            const deleteX = document.createElement("div");
            deleteX.classList.add("delete-x");
            deleteX.textContent = "X";
            deleteX.addEventListener("click", (e) => deleteWatchListItem(e));
            stockItem.appendChild(stockSymbol);
            stockItem.appendChild(stockPrice);
            stockItem.appendChild(stockChange);
            stockItem.appendChild(deleteX);
        });
    } catch(err) {
        console.error('Failed to load watchlist', err);
    }
};


//Fetch current prices for all stocks
async function fetchCurrentPrices(stocks) {
    const prices = {
        stockPrices: {},
        stockChanges: {},
    };

    for (const stock of stocks) {
        try {
            const response = await fetch(`/api/quote/${stock.ticker}`);
            if (!response.ok) continue;
            const data = await response.json();
            console.log(data);
            if (data.success && data.quote) {
                prices.stockPrices[stock.ticker] = parseFloat(data.quote['05. price']);
                prices.stockChanges[stock.ticker] = parseFloat(data.quote['09. change']);
            }
        } catch (error) {
            console.error(`Error fetching current stock data for ${stock.ticker}:`, error);
        }
    }
    console.log(prices);
    return prices;
};


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

window.onload = loadWatchlist;