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

searchInput.addEventListener("input", (event) => {
    clearTimeout(debounceTimer); // Reset timer on each keystroke
    const input = event.target.value.toUpperCase();
    getStockRecommendations(input);
});

// User clicks search and if the stock exist then display the stock data
// otherwise display that the stock does not exist
// Or if the input is empty then display that the input is invalid
searchButton.addEventListener("click", (event) => {
    const input = searchInput.value.toUpperCase();
    makeSearchRequest(input);
});

function displayResults(data) {
    console.log('Raw search data:', data);
    ul.innerHTML = ''; // Clear previous results
    ul.textContent = '';

    if (!data) {
        ul.textContent = 'No results found';
        return;
    }

    // Support both our proxy shape { success, results: [...] } and AlphaVantage original { bestMatches: [...] }
    let matches = [];
    if (Array.isArray(data.results)) matches = data.results;
    else if (Array.isArray(data.bestMatches)) matches = data.bestMatches;
    else if (Array.isArray(data.best_matches)) matches = data.best_matches;

    if (!Array.isArray(matches) || matches.length === 0) {
        ul.textContent = 'No results found';
        return;
    }

    matches.forEach(item => {
        // item may be in AlphaVantage format (keys like '1. symbol') or in a simpler object
        const symbol = item['1. symbol'] || item['symbol'] || item.Symbol || '';
        const name = item['2. name'] || item['name'] || item.Name || '';
        const li = document.createElement('li');
        li.textContent = symbol ? `${symbol} - ${name}` : JSON.stringify(item);
        if (symbol) li.dataset.symbol = symbol;
        li.addEventListener('click', () => {
            const s = symbol || li.dataset.symbol;
            if (s) fetchQuoteAndShow(s);
        });
        ul.appendChild(li);
    });
}
// Needs Implementing
function setUpStockData(data) {
    const stockContainer = document.querySelector('.stock-container');
    stockContainer.style.display = 'flex';
    const stockSymbol = document.getElementById('stock-symbol');
    const stockOpen = document.getElementById('stock-open');
    const stockHigh = document.getElementById('stock-high');
    const stockLow = document.getElementById('stock-low');
    const stockPrice = document.getElementById('stock-price');
    const stockVolume = document.getElementById('stock-volume');
    const stockChange = document.getElementById('stock-change');
    const stockChangePercent = document.getElementById('stock-change-percent');
    stockSymbol.textContent = data['Global Quote']['01. symbol'];
    stockOpen.textContent = `Open: ${data['Global Quote']['02. open']}`;
    stockHigh.textContent = data['Global Quote']['03. high'];
    stockLow.textContent = data['Global Quote']['04. low'];
    stockPrice.textContent = data['Global Quote']['05. price'];
    stockVolume.textContent = data['Global Quote']['06. volume'];
    stockChange.textContent = data['Global Quote']['09. change'];
    stockChangePercent.textContent = data['Global Quote']['10. change percent'];

    // set hidden form values for buy
    const buyPrice = document.getElementById('buy-price');
    const buyTicker = document.getElementById('buy-ticker');
    buyPrice.value = data['Global Quote']['05. price'];
    buyTicker.value = data['Global Quote']['01. symbol'];
}

function makeSearchRequest(input) {
    console.log('User input:', input);
    if (input.length === 0) {
        ul.innerHTML = '';
        ul.textContent = 'enter a ticker symbol';
        return;
    } 

    // if (input.length >= 1 && input.length <= 5) {
    //     fetch(`/api/stock/${input}`)
    //         .then(response => response.json())
    //         .then(data => {
    //             setUpStockData(data);
    //         })
    //         .catch(err => {
    //             console.error('Search error', err);
    //             ul.innerHTML = '';
    //             ul.textContent = 'Error fetching results';
    //         });
    // }
    
    // testing with demo key
    fetch("https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=demo"
    ).then(response => response.json()).then(data => {
        setUpStockData(data);
        searchInput.value = '';
        ul.innerHTML = '';
        ul.textContent = '';
    })
    .catch(err => {
        console.error('Search error', err);
        searchInput.value = '';
        ul.innerHTML = '';
        ul.textContent = 'Error fetching results';
    });
}

function getStockRecommendations(input) {
    console.log('User input:', input);
    if (input.length < 2) {
        ul.innerHTML = '';
        ul.textContent = '';
        return;
    }
    if (input.length >= 2 && input.length <= 5) {
        debounceTimer = setTimeout(() => {
            // Uncomment for real implementation
            // fetch(`/api/search/${input}`)
            //     .then(response => response.json())
            //     .then(data => {
            //         displayResults(data);
            //     })
            //     .catch(err => {
            //         console.error('Search error', err);
            //         const ul = document.getElementById('result-list');
            //         ul.innerHTML = '';
            //         ul.textContent = 'Error fetching results';
            //     });
            // console.log('Fetching results for:', input);

            // testing with demo key
            fetch(`https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=tesco&apikey=demo`)
            .then(response => response.json()).then(data => {
                displayResults(data);
            })
            .catch(err => {
                console.error('Search error', err);
                //const ul = document.getElementById('result-list');
                ul.innerHTML = '';
                ul.textContent = 'Error fetching results';
        
            });
        }, 1500); // Wait 300ms after last input
    }
}

// Fetch quote via server proxy and display using setUpStockData
async function fetchQuoteAndShow(symbol) {
    try {
        //const resp = await fetch(`/api/quote/${encodeURIComponent(symbol)}`);
        // const payload = await resp.json();
        // if (!resp.ok || !payload.success) {
        //     throw new Error(payload.message || 'Error fetching quote');
        // }
        // // AlphaVantage returns the Global Quote object
        // const quote = payload.quote;
        // setUpStockData({ 'Global Quote': quote });
        // ul.innerHTML = '';
        const resp = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=demo`);
        const payload = await resp.json();
        console.log(payload);
        // AlphaVantage returns the Global Quote object
        const quote = payload["Global Quote"];
        setUpStockData({ 'Global Quote': quote });
        ul.innerHTML = '';
    } catch (err) {
        console.error('Quote fetch error', err);
        const stockContainer = document.querySelector('.stock-container');
        stockContainer.style.display = 'none';
        ul.innerHTML = '';
        ul.textContent = 'Error fetching quote';
    }
}

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