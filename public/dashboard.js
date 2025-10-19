// Basic form display(Requires further implementation)
//document.getElementById("buyButton").style.display = "none";
const buyBtn = document.getElementById("buyBtn");
const canvas = document.getElementById("priceChart");
const searchBtn = document.getElementById("searchBtn");
const tickerInput = document.getElementById("ticker");
const searchedTickerData = document.getElementById("searchedTickerPrice");

async function showForm(type) {
    document.getElementById("form-title").textContent = type === "buy" ? "Buy Stock" : "Sell Stock";
    document.getElementById("trade-form").style.display = "block";
}

function closeForm() {
    document.getElementById("trade-form").style.display = "none";
}

searchBtn.addEventListener('click', async () => {
    try {
        const ticker = tickerInput.value.toUpperCase();
        console.log(ticker);
        if (!ticker || ticker.length === 0 || ticker == "") {
            alert("Enter a valid ticker symbol");
            return;
        }
        // Real implementation
        // const response = await fetch(`/api/quote/${ticker}`);
        // if (!response.ok) {
        //     throw new Error(`AlphaVantage HTTP ${searchResponse.status}`);
        // }
        // const stockData = await response.json();
        // console.log(stockData);
        // searchedTickerData.innerText = stockData["Global Quote"]["01. symbol"] + " " + stockData["Global Quote"]["05. price"].toFixed(2);
        // Demo key for devolopment
        const response = await fetch("https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=demo");
        if (!response.ok) {
            throw new Error(`AlphaVantage HTTP ${searchResponse.status}`);
        }
        const stockData = await response.json();
        console.log(stockData);
        searchedTickerData.innerText = stockData["Global Quote"]["01. symbol"] + " " + parseFloat(stockData["Global Quote"]["05. price"]).toFixed(2);
        showForm("buy");
        buyBtn.style.display = "block";
        // Set hidden input values for form submission
        document.getElementById("hiddenTicker").value = stockData["Global Quote"]["01. symbol"];
        document.getElementById("hiddenPrice").value = parseFloat(stockData["Global Quote"]["05. price"]).toFixed(2);
    } catch (error) {
        console.error('Error fetching stock data:', error);
    }
})

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

buyBtn.addEventListener("click", function () {
    const amount = document.getElementById("quantity").value;
    let searchedTickerPrice2 = document.getElementById(
        "searchedTickerPrice"
    );
    const num = parseFloat(searchedTickerPrice2.textContent) * amount;
    alert("Bought $" + num + " of stock in" + tickerInput);
});


if (buyBtn) {
    buyBtn.addEventListener("click", async function () {
    const amount = document.getElementById("quantity").value; //how many shares they want to buy

    const num = parseFloat(searchedTickerPrice.textContent) * amount; // the total price (share price * shares)

    const data = await getFunds();

    if (data.availableFunds < num) {
        alert("Not enough money");
    }

    invested += num;
    });
}

// Fetch data from the server and populate tables
async function fetchStockData() {
    try {
        //const response = await fetch('/api/stockList');
        const response = await fetch("https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo")
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
        // const top_gainersArray = data.stockList.top_gainers;
        // const top_losersArray = data.stockList.top_losers;
        // const most_actively_tradedArray = data.stockList.most_actively_traded;
        const top_gainersArray = data.top_gainers;
        const top_losersArray = data.top_losers;
        const most_actively_tradedArray = data.most_actively_traded;

        populateTable(top_gainersArray, gainersTable);
        populateTable(top_losersArray, losersTable);
        populateTable(most_actively_tradedArray, activeTable);

    } catch (error) {
        console.error('Error fetching stock data:', error);
    }
}

// const ctx = canvas.getContext("2d");
// let portfolioValue = 0;
// let avgPrice = portfolioValue;
// let prices = [avgPrice];

// function draw() {
//     ctx.clearRect(0, 0, canvas.width, canvas.height);
//     ctx.beginPath();
//     ctx.moveTo(0, canvas.height - avgPrice);
//     for (let i = 0; i < prices.length; i++) {
//         ctx.lineTo(i * 4, canvas.height - prices[i]);
//     }
//     ctx.lineWidth = 1; // Line thickness 5px
//     ctx.strokeStyle = "green"; // Blue color line
//     ctx.lineCap = "round"; // Rounded line endpoints
//     ctx.lineJoin = "round"; // Rounded corners between lines

//     ctx.stroke();
// }

// function update() {
//     avgPrice = portfolioValue / 3;
//     prices.push(avgPrice);
//     if (prices.length > 100) prices.shift();
//     draw();
// }

// setInterval(update, 100);

// Basic search (Requires further implementation)
async function searchStock() {
    const searchedTickerPrice = document.getElementById(
        "searchedTickerPrice"
    );
    const tickerInput = document
        .getElementById("ticker")
        .value.toUpperCase();
    //const response = await fetch(
    //  "https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=YOUR_API_KEY"
    //);
    //const json = await response.json();
    //console.log(JSON.stringify(json));

    console.log(JSON.stringify(json));

    const ticker = document.getElementById("ticker").value.toUpperCase();
    if (ticker) {
        const topGainers = json.top_gainers;

        for (let i = 0; i < topGainers.length; i++) {
        if (topGainers[i].ticker === ticker) {
            console.log(
            `Found ticker ${ticker} with price: ${topGainers[i].price}`
            );

            searchedTickerPrice.textContent = topGainers[i].price;

            document.getElementById("buyButton").style.display = "block";

            // Set hidden input values for form submission
            document.getElementById("hiddenTicker").value = tickerInput;
            document.getElementById("hiddenPrice").value =
            topGainers[i].price;

            break; // Stop the loop once found
        }
        }
    } else {
        alert("Please enter a stock ticker.");
    }
}

// async function simulateStockUpdates() {
//     portfolioValue = 0;
//     const res = await fetch("/api/getStocks");
//     const data = await res.json();
//     if (data.success) {
//         data.stocks.forEach((stock) => {
//         stock.avgPrice += Math.random() - 0.5; // Random walk
//         console.log(`Updated ${stock.ticker} to ${stock.avgPrice}`);
//         });
//         data.stocks.forEach((stock) => {
//         portfolioValue += stock.quantity * stock.avgPrice;

//         fetch("/api/updatePrice", {
//             method: "POST",
//             headers: {
//             "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//             ticker: stock.ticker,
//             price: stock.avgPrice.toFixed(2),
//             }),
//         })
//             .then((response) => response.json())
//             .then((data) => {
//             console.log(data);
//             });

//         if (portfolioValue > invested) {
//             document.getElementById("portfolio-value").textContent =
//             "Portfolio Value: $" +
//             portfolioValue.toFixed(2) +
//             "🤑" +
//             (portfolioValue / invested).toFixed(2) +
//             "%";
//         } else
//             document.getElementById("portfolio-value").textContent =
//             "Portfolio Value: $" +
//             portfolioValue.toFixed(2) +
//             "😭" +
//             (portfolioValue / invested).toFixed(2) +
//             "%";
//         });
//     }
// }

// setInterval(simulateStockUpdates, 1000); // Update every 5 seconds

// async function getFunds() {
//     const res = await fetch("/api/getFunds");
//     const data = await res.json();
//     if (data.success) {
//     document.getElementById("available-funds-buy").textContent =
//         "Available funds: " + data.availableFunds;

//     invested = 1000 - data.availableFunds;
//     document.getElementById("invested").textContent =
//         "Invested " + "$" + invested.toFixed(2);
//     } else {
//     console.error("Failed to fetch funds:", data.message);
//     }
// }

// getFunds();
// setInterval(getFunds, 2000);
window.onload = fetchStockData;