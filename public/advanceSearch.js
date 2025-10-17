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
    // uncomment for real implementation
    // if (!data || !data.success || !Array.isArray(data.results)) {
    //     ul.textContent = 'No results found';
    //     return;
    // } else if (data.results.length === 0) {
    //     ul.textContent = 'No best matches';
    //     return;
    // } else {
    //     console.log(ul);
    //     data.results.forEach(item => {
    //         const li = document.createElement('li');
    //         li.textContent = `${item['1. symbol']} - ${item['2. name']}`;
    //         console.log(li);
    //         ul.appendChild(li);
    //     });
        
    // }
    // console.log('Search results:', data.results);

    // testing with demo key
    data.bestMatches.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item['1. symbol']} - ${item['2. name']}`;
        console.log(li);
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
            fetch("https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=tesco&apikey=demo")
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