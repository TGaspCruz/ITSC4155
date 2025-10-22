let portfolioValue = 0;

export async function simulateStockUpdates() {
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

    const portfolioElem = document.getElementById("portfolio-value");
    if (portfolioElem) {
      portfolioElem.textContent =
        "Portfolio Value: $" + portfolioValue.toFixed(2);
    }
  }
}
