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

const searchButton = document.getElementById("searchButton");
const searchInput = document.getElementById("input-box");
const searchResults = document.getElementById("searchResults");
const ul = document.getElementById('result-list');
let debounceTimer;

searchInput.addEventListener("input", (event) => {
    clearTimeout(debounceTimer);
    const input = event.target.value.toUpperCase();
    //getStockRecommendations(input);
    console.log('User input:', input);
    if (input.length >= 2 && input.length <= 5) {
        fetch(`/api/search/${input}`)
            .then(response => response.json())
            .then(data => {
                displayResults(data);
            })
            .catch(err => {
                console.error('Search error', err);
                ul.innerHTML = ''; // Clear previous results
                ul.textContent = 'Error fetching results';
            });
    }
});

// User clicks search and if the stock exist then display the stock data
// otherwise display that the stock does not exist
// Or if the input is empty then display that the input is invalid
searchButton.addEventListener("click", (event) => {
    const input = searchInput.value.toUpperCase();
    console.log('User input:', input);
    if (input.length === 0) {
        ul.innerHTML = '';
        ul.textContent = 'enter a ticker symbol';
        return;
    }

    if (input.length >= 1 && input.length <= 5) {
        fetch(`/api/stock/${input}`)
            .then(response => response.json())
            .then(data => {
                setUpStockData(data);
            })
            .catch(err => {
                console.error('Search error', err);
                ul.innerHTML = '';
                ul.textContent = 'Error fetching results';
            });
    }
});

function displayResults(data) {
    console.log('Raw search data:', data);
    ul.innerHTML = ''; // Clear previous results
    ul.textContent = '';
    // Real Implementation
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

