setInterval(simulateStockUpdates, 1000);

document.getElementById("buyButton").style.display = "none";
const buyBtn = document.getElementById("buyBtn");
const canvas = document.getElementById("priceChart");

function showForm(type) {
  document.getElementById("form-title").textContent =
    type === "buy" ? "Buy Stock" : "Sell Stock";
  document.getElementById("trade-form").style.display = "block";

  document.getElementById("buyButton").style.display = "none";
}

function closeForm() {
  document.getElementById("trade-form").style.display = "none";
  document.getElementById("buyButton").style.display = "block";
}

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    const response = await fetch("/logout", { method: "POST" });
    window.location.href = "/";
  } catch (err) {
    console.error("Logout failed", err);
    window.location.href = "/";
  }
});

async function fetchStockData() {
  try {
    const response = await fetch(
      "https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo"
    );
    if (!response.ok) {
      throw new Error(`AlphaVantage HTTP ${response.status}`);
    }
    const data = await response.json();
    const gainersTable = document.getElementById("TopGainerTable");
    const losersTable = document.getElementById("TopLosersTable");
    const activeTable = document.getElementById("TopActivelyTraded");

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

    const top_gainersArray = data.top_gainers;
    const top_losersArray = data.top_losers;
    const most_actively_tradedArray = data.most_actively_traded;

    populateTable(top_gainersArray, gainersTable);
    populateTable(top_losersArray, losersTable);
    populateTable(most_actively_tradedArray, activeTable);
  } catch (error) {
    console.error("Error fetching stock data:", error);
  }
}

async function searchStock() {
  const searchedTickerPrice = document.getElementById("searchedTickerPrice");
  const tickerInput = document.getElementById("ticker").value.toUpperCase();
  const response = await fetch(
    "https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo"
  );
  const json = await response.json();

  const ticker = document.getElementById("ticker").value.toUpperCase();
  if (ticker) {
    const topGainers = json.top_gainers;
    const topLosers = json.top_losers;
    const mostActivelyTraded = json.most_actively_traded;

    for (let i = 0; i < topGainers.length; i++) {
      if (topGainers[i].ticker === ticker) {
        searchedTickerPrice.textContent =
          "Price per share: $" + topGainers[i].price;
        document.getElementById("buyButton").style.display = "block";
        document.getElementById("hiddenTicker").value = tickerInput;
        document.getElementById("hiddenPrice").value = topGainers[i].price;
        break;
      }
    }

    for (let i = 0; i < topLosers.length; i++) {
      if (topLosers[i].ticker === ticker) {
        searchedTickerPrice.textContent =
          "Price per share: $" + topLosers[i].price;
        document.getElementById("buyButton").style.display = "block";
        document.getElementById("hiddenTicker").value = tickerInput;
        document.getElementById("hiddenPrice").value = topLosers[i].price;
        break;
      }
    }

    for (let i = 0; i < mostActivelyTraded.length; i++) {
      if (mostActivelyTraded[i].ticker === ticker) {
        searchedTickerPrice.textContent =
          "Price per share: $" + mostActivelyTraded[i].price;
        document.getElementById("buyButton").style.display = "block";
        document.getElementById("hiddenTicker").value = tickerInput;
        document.getElementById("hiddenPrice").value =
          mostActivelyTraded[i].price;
        break;
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
      const amount = document.getElementById("quantity").value;
      const num =
        parseFloat(document.getElementById("searchedTickerPrice").textContent) *
        amount;

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
  } else {
    console.error("Failed to fetch funds:", data.message);
  }
  return data;
}

let portfolioValue = 0;

async function simulateStockUpdates() {
  portfolioValue = 0;
  const res = await fetch("/api/getStocks");
  const data = await res.json();
  if (data.success) {
    data.stocks.forEach((stock) => {
      stock.avgPrice += Math.random() - 0.5; // Random walk
      if (stock.avgPrice < 0) return;
      portfolioValue += stock.quantity * stock.avgPrice;

      fetch("/api/updatePrice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticker: stock.ticker,
          price: stock.avgPrice.toFixed(2),
        }),
      })
        .then((response) => response.json())
        .then((data) => console.log(data));
    });
  }
}

getFunds();
setInterval(getFunds, 2000);
window.onload = fetchStockData;

module.exports = {
  fetchStockData,
  searchStock,
  showForm,
  closeForm,
  getFunds,
};
