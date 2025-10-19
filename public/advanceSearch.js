"use strict";
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

const searchInput = document.getElementById("input-box");
const searchResults = document.getElementById("searchResults");
const ul = document.getElementById('result-list');
let debounceTimer;
const searchContainer = document.querySelector('.search-container');
const stockContainer = document.querySelector('.stock-container');

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
    const input = searchInput.value.toUpperCase();
    makeSearchRequest(input);
});

// Display search results in the dropdown
function displayBestMatchResults(data) {
    console.log('Raw search data:', data);
    ul.innerHTML = ''; // Clear previous results
    ul.textContent = '';
    searchResults.style.display = 'block';

    if (!data || data.results.length === 0) {
        ul.textContent = 'No best matches';
        return;
    }

    // Support both our proxy shape { success, results: [...] } and AlphaVantage original { bestMatches: [...] }
    let bestStockMatches = [];
    if (Array.isArray(data.results)) bestStockMatches = data.results;
    else if (Array.isArray(data.bestMatches)) bestStockMatches = data.bestMatches;
    else if (Array.isArray(data.best_matches)) bestStockMatches = data.best_matches;

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

// Makes stock request for either search button click or dropdown selection
function makeSearchRequest(input) {
    console.log('User input:', input);
    if (input.length === 0) {
        ul.innerHTML = '';
        ul.textContent = 'enter a ticker symbol';
        searchResults.style.display = 'block';
        return;
    } 

    if (input.length >= 1 && input.length <= 5) {
        // fetch(`/api/quote/${input}`)
        fetch("https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=demo"
        ).then(response => response.json()).then(data => {
            setUpStockData(data);
            searchInput.value = '';
            hideResults();
        })
        .catch(err => {
            console.error('Search error', err);
            searchInput.value = '';
            ul.innerHTML = '';
            ul.textContent = 'Error fetching results';
        });
    }
}
// Fetch stock recommendations based on user input
function getStockRecommendations(input) {
    console.log('User input:', input);
    if (input.length < 2) {
        // ul.innerHTML = '';
        // ul.textContent = '';
        hideResults();
        return;
    }
    if (input.length >= 2 && input.length <= 5) {
        debounceTimer = setTimeout(() => {
            // Switch API call for real implementation
            // fetch(`/api/search/${input}`
            // testing with demo key
            fetch(`https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=tesco&apikey=demo`)
            .then(response => response.json()).then(data => {
                displayBestMatchResults(data);
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

function hideResults() {
    if (ul) ul.innerHTML = '';
    if (searchResults) searchResults.style.display = 'none';
}
// Fetch quote via server proxy and display using setUpStockData
// async function fetchQuoteAndShow(symbol) {
//     try {
//         // Real Implementation
//         //const resp = await fetch(`/api/quote/${encodeURIComponent(symbol)}`);
//         // const payload = await resp.json();
//         // if (!resp.ok || !payload.success) {
//         //     throw new Error(payload.message || 'Error fetching quote');
//         // }
//         // // AlphaVantage returns the Global Quote object
//         // const quote = payload.quote;
//         // setUpStockData({ 'Global Quote': quote });
//         // ul.innerHTML = '';
//         const resp = await fetch(`shttps://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=demo`);
//         const payload = await resp.json();
//         console.log(payload);
//         // AlphaVantage returns the Global Quote object
//         const quote = payload["Global Quote"];
//         setUpStockData({ 'Global Quote': quote });
//         hideResults();
//     } catch (err) {
//         stockContainer.style.display = 'none';
//         ul.innerHTML = 'df';
//         ul.textContent = 'Error fetching quote';
//         searchResults.style.display = 'block';
//         console.error('Quote fetch error', err);
//     }
// }

// Handle buy form submission
document.getElementById('buyForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qty = Number(document.getElementById('buy-quantity').value);
    const price = Number(document.getElementById('buy-price').value);
    const ticker = document.getElementById('buy-ticker').value;
    const buyMessage = document.getElementById('buyMessage');
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
    } catch (err) {
        console.error('Buy request failed', err);
        buyMessage.style.color = 'red';
        buyMessage.textContent = 'Network error during purchase';
    }
});
// Take the stock data and populate the stock details section
function setUpStockData(data) {
    const stockContainer = document.querySelector('.stock-container');
    const stockSymbol = document.getElementById('stock-symbol');
    const stockOpen = document.getElementById('stock-open');
    const stockHigh = document.getElementById('stock-high');
    const stockLow = document.getElementById('stock-low');
    const stockPrice = document.getElementById('stock-price');
    const stockVolume = document.getElementById('stock-volume');
    const stockChange = document.getElementById('stock-change');
    const stockChangePercent = document.getElementById('stock-change-percent');
    const tradeForm = document.getElementById('trade-form');
    const tradeTicker = document.getElementById('trade-ticker');
    const tradePrice = document.getElementById('trade-price');
    const quote = data['Global Quote'];
    console.log('Stock quote data:', quote);
    if (!quote || Object.keys(quote).length === 0 || !quote['01. symbol']) {
        ul.innerHTML = '';
        ul.textContent = 'No stock data found';
        return;
    }
    stockContainer.style.display = 'flex';
    stockSymbol.textContent = quote['01. symbol'];
    stockOpen.textContent = `Open: ${quote['02. open']}`;
    stockHigh.textContent = `High: ${quote['03. high']}`;
    stockLow.textContent = `Low: ${quote['04. low']}`;
    stockPrice.textContent = `Price: ${quote['05. price']}`;
    stockVolume.textContent = `Volume: ${quote['06. volume']}`;
    stockChange.textContent = `Change: ${quote['09. change']}`;
    stockChangePercent.textContent = `Change %: ${quote['10. change percent']}`;
    tradeTicker.value = quote['01. symbol'] || '';
    tradePrice.value = quote['05. price'] || '';
    if (tradeForm) tradeForm.style.display = 'flex';
    // set hidden form values for buy
    const buyPrice = document.getElementById('buy-price');
    const buyTicker = document.getElementById('buy-ticker');
    // buyPrice.value = data['Global Quote']['05. price'];
    // buyTicker.value = data['Global Quote']['01. symbol'];
}