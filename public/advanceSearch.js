"use strict";
const searchInput = document.getElementById("input-box");
const searchButton = document.getElementById('searchButton');
const searchResults = document.getElementById("searchResults");
const ul = document.getElementById('result-list');
const searchContainer = document.querySelector('.search-container');
const stockContainer = document.querySelector('.stock-container');
const stockSymbol = document.getElementById('stock-symbol');
const stockOpen = document.getElementById('stock-open');
const stockHigh = document.getElementById('stock-high');
const stockLow = document.getElementById('stock-low');
const stockPrice = document.getElementById('stock-price');
//const stockVolume = document.getElementById('stock-volume');
const stockChange = document.getElementById('stock-change');
const stockChangePercent = document.getElementById('stock-change-percent');
const tradeTicker = document.getElementById('trade-ticker');
const tradePrice = document.getElementById('trade-price');
const availableFundsBuy = document.getElementById("available-funds-buy");
let debounceTimer = null;
// Basic logout (Requires further implementation)
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

// Close results if user clicks outside the search container
document.addEventListener('click', (e) => {
    if (!searchContainer) return;
    if (!searchContainer.contains(e.target)) {
        hideResults();
    }
});
// As the user inputs charaters, a list of best matches is shown
searchInput.addEventListener("input", (event) => {
    clearTimeout(debounceTimer); // Reset timer on each keystroke
    const input = event.target.value.toUpperCase();
    getStockRecommendations(input);
});
// User clicks search and if the stock exist then display the stock data
// otherwise display that the stock does not exist
// Or if the input is empty then display that the input is invalid
searchButton.addEventListener("click", () => {
    clearTimeout(debounceTimer); // Stop fetch call if search button is clicked before stock recommendations are shown
    const input = searchInput.value.toUpperCase();
    makeSearchRequest(input);
});
// Fetch stock recommendations based on user input
function getStockRecommendations(input) {
    console.log('User input:', input);
    if (input.length < 2) {
        hideResults();
        return;
    }
    if (input.length >= 2 && input.length <= 5) {
        debounceTimer = setTimeout(() => {
            fetch(`/api/search/${input}`)
            .then(response => response.json()).then(data => {
               displayBestMatchResults(data.bestMatches);
            })
            .catch(err => {
                console.error('Search error', err);
                ul.innerHTML = '';
                ul.textContent = 'Error fetching results';
                searchResults.style.display = 'block';
            });
        }, 1500); // Wait 300ms after last input
    }
}

// Makes stock request for either search button click or dropdown selection
async function makeSearchRequest(input) {
    try {
        console.log('User input:', input);
        if (input.length === 0) {
            ul.innerHTML = '';
            ul.textContent = 'enter a ticker symbol';
            searchResults.style.display = 'block';
            return;
        } 
        if (input.length >= 1 && input.length <= 10) {
            const [quoteResponse, availableFundsResponse] = await Promise.all([
                fetch(`/api/quote/${input}`).then(res => res.json()),
                fetch('/api/getFunds').then(res => res.json())
            ]);
            if (!quoteResponse.success) {
                ul.innerHTML = '';
                ul.textContent = 'Ticker Symbol not found';
                searchResults.style.display = 'block';
                return;
            }
            if (!availableFundsResponse.success) {
                ul.innerHTML = '';
                ul.textContent = `${availableFundsResponse.message}`;
                searchResults.style.display = 'block';
                return;
            }
            setUpStockData(quoteResponse.quote);
            availableFundsBuy.textContent = `Available funds: $${availableFundsResponse.availableFunds.toFixed(2)}`;
            searchInput.value = '';
            hideResults();
        }
    } catch (error) {
        console.log('Search error', error);
        searchInput.value = '';
        ul.innerHTML = '';
        ul.textContent = 'Error fetching results';
    }
}
// Handle trade form submission
document.getElementById('trade-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qty = Number(document.getElementById('trade-quantity').value);
    const price = Number(document.getElementById('trade-price').value);
    const ticker = document.getElementById('trade-ticker').value;
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
            buyMessage.textContent = payload.message || 'Purchase failed';
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
});
// Display search results in the dropdown
function displayBestMatchResults(bestStockMatches) {
    console.log('Raw search data:', bestStockMatches);
    ul.innerHTML = ''; // Clear previous results
    ul.textContent = '';
    searchResults.style.display = 'block';
    if (!Array.isArray(bestStockMatches) || bestStockMatches.length === 0) {
        ul.textContent = 'No best matches';
        return;
    }
    bestStockMatches.forEach(item => {
        const symbol = item['1. symbol'];
        const name = item['2. name'];
        const li = document.createElement('li');
        li.textContent = `${symbol} - ${name}`;
        console.log(li);
        li.textContent = `${symbol} - ${name}`;
        li.addEventListener('click', () => {
            const s = symbol;
            makeSearchRequest(s);
        });
        ul.appendChild(li);
    });
}
// Take the stock data and populate the stock details section
function setUpStockData(quote) {
    stockContainer.style.display = 'flex';
    stockSymbol.textContent = quote['01. symbol'];
    stockOpen.textContent = `Open: $${parseFloat(quote['02. open']).toFixed(2)}`;
    stockHigh.textContent = `High: $${parseFloat(quote['03. high']).toFixed(2)}`;
    stockLow.textContent = `Low: $${parseFloat(quote['04. low']).toFixed(2)}`;
    stockPrice.textContent = `Price: $${parseFloat(quote['05. price']).toFixed(2)}`;
    // stockVolume.textContent = `Volume: ${quote['06. volume']}`;
    stockChange.textContent = `Change: $${parseFloat(quote['09. change']).toFixed(2)}`;
    stockChangePercent.textContent = `Change %: ${parseFloat(quote['10. change percent']).toFixed(2)}`;
    tradeTicker.value = quote['01. symbol'] || '';
    tradePrice.value = quote['05. price'] || '';
    // set hidden form values for buy
    document.getElementById('trade-price').value = quote['05. price'];
    document.getElementById('trade-ticker').value = quote['01. symbol'];
}

function hideResults() {
    ul.innerHTML = '';
    searchResults.style.display = 'none';
}

module.exports = { getStockRecommendations, makeSearchRequest, displayBestMatchResults, setUpStockData, hideResults };
