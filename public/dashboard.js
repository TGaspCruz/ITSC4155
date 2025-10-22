import { simulateStockUpdates } from "./stockUpdates.mjs";
setInterval(simulateStockUpdates, 1000);

// Basic form display(Requires further implementation)
document.getElementById("buyButton").style.display = "none";
const buyBtn = document.getElementById("buyBtn");
const canvas = document.getElementById("priceChart");

function showForm(type) {
  document.getElementById("form-title").textContent =
    type === "buy" ? "Buy Stock" : "Sell Stock";
  document.getElementById("trade-form").style.display = "block";
}

function closeForm() {
  document.getElementById("trade-form").style.display = "none";
}

// Basic logout (Requires further implementation)
document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    const response = await fetch("/logout", { method: "POST" });
    // ignore response and redirect to login (Testing Logout)
    window.location.href = "/";
  } catch (err) {
    console.error("Logout failed", err);
    window.location.href = "/";
  }
});

// Fetch data from the server and populate tables
async function fetchStockData() {
  try {
    //const response = await fetch('/api/stockList');
    const response = await fetch(
      "https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo"
    );
    if (!response.ok) {
      throw new Error(`AlphaVantage HTTP ${searchResponse.status}`);
    }
    console.log(response);
    const data = await response.json();
    console.log(data);
    const gainersTable = document.getElementById("TopGainerTable");
    const losersTable = document.getElementById("TopLosersTable");
    const activeTable = document.getElementById("TopActivelyTraded");

    // Function to populate a table with stock data
    function populateTable(stocks, table) {
      let html =
        "<tr><th>Ticker</th><th>Price</th><th>Change</th><th>Change%</th><th>Volume</th></tr>";
      stocks.forEach((stock) => {
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
    console.log(top_gainersArray);
    const top_losersArray = data.top_losers;
    const most_actively_tradedArray = data.most_actively_traded;

    populateTable(top_gainersArray, gainersTable);
    populateTable(top_losersArray, losersTable);
    populateTable(most_actively_tradedArray, activeTable);
  } catch (error) {
    console.error("Error fetching stock data:", error);
  }
}

// Basic search (Requires further implementation)
async function searchStock() {
  const searchedTickerPrice = document.getElementById("searchedTickerPrice");
  const tickerInput = document.getElementById("ticker").value.toUpperCase();
  const response = await fetch(
    "https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo"
  );
  const json = await response.json();
  //console.log(JSON.stringify(json));

  console.log(JSON.stringify(json));

  const ticker = document.getElementById("ticker").value.toUpperCase();
  if (ticker) {
    const topGainers = json.top_gainers;
    const topLosers = json.top_losers;
    const mostActivelyTraded = json.most_actively_traded;

    for (let i = 0; i < topGainers.length; i++) {
      if (topGainers[i].ticker === ticker) {
        console.log(
          `Found ticker ${ticker} with price: ${topGainers[i].price}`
        );

        searchedTickerPrice.textContent = topGainers[i].price;

        document.getElementById("buyButton").style.display = "block";

        // Set hidden input values for form submission
        document.getElementById("hiddenTicker").value = tickerInput;
        document.getElementById("hiddenPrice").value = topGainers[i].price;

        break; // Stop the loop once found
      }
    }

    for (let i = 0; i < topLosers.length; i++) {
      if (topLosers[i].ticker === ticker) {
        console.log(`Found ticker ${ticker} with price: ${topLosers[i].price}`);

        searchedTickerPrice.textContent = topLosers[i].price;

        document.getElementById("buyButton").style.display = "block";

        // Set hidden input values for form submission
        document.getElementById("hiddenTicker").value = tickerInput;
        document.getElementById("hiddenPrice").value = topLosers[i].price;

        break; // Stop the loop once found
      }
    }

    for (let i = 0; i < mostActivelyTraded.length; i++) {
      if (mostActivelyTraded[i].ticker === ticker) {
        console.log(
          `Found ticker ${ticker} with price: ${mostActivelyTraded[i].price}`
        );

        searchedTickerPrice.textContent = mostActivelyTraded[i].price;

        document.getElementById("buyButton").style.display = "block";

        // Set hidden input values for form submission
        document.getElementById("hiddenTicker").value = tickerInput;
        document.getElementById("hiddenPrice").value =
          mostActivelyTraded[i].price;

        break; // Stop the loop once found
      }
    }
  } else {
    alert("Please enter a stock ticker.");
  }
}

buyBtn.addEventListener("click", function () {
  const amount = document.getElementById("quantity").value;
  let searchedTickerPrice2 = document.getElementById("searchedTickerPrice");
  const num = parseFloat(searchedTickerPrice2.textContent) * amount;
  alert("Bought $" + num + " of stock in" + tickerInput);
});

document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) {
    searchBtn.addEventListener("click", searchStock);
  }

  const buyButton = document.getElementById("buyButton");
  if (buyButton) {
    buyButton.addEventListener("click", () => showForm("buy"));
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        const response = await fetch("/logout", { method: "POST" });
        window.location.href = "/";
      } catch (err) {
        console.error("Logout failed", err);
        window.location.href = "/";
      }
    });
  }

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
});

async function getFunds() {
  const res = await fetch("/api/getFunds");
  const data = await res.json();
  if (data.success) {
    document.getElementById("available-funds-buy").textContent =
      "Available funds: " + data.availableFunds;

    invested = 1000 - data.availableFunds;
    //document.getElementById("invested").textContent =
    //  "Invested " + "$" + invested.toFixed(2);
  } else {
    console.error("Failed to fetch funds:", data.message);
  }
}

getFunds();
setInterval(getFunds, 2000);
window.onload = fetchStockData;
