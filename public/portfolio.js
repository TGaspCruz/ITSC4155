// Fetch and display logged in user portfolio data
async function loadPortfolio() {
    console.log("LoadPortfolio");
    try {
        const res = await fetch('/api/user');
        if (!res.ok) {
            if (res.status === 401) window.location.href = '/';
            throw new Error(`HTTP ${res.status}`);
        }
        const user = await res.json();
        if (!user.success) throw new Error(user.message || 'API error');

        const tbody = document.getElementById('holdings-body');
        tbody.innerHTML = '';
        const stocks = user.portfolio.stocks || [];
        if (!stocks.length) {
            document.getElementById('username').textContent = `${user.username}'s Portfolio`;
            document.getElementById('available-funds').textContent = `$${user.portfolio.availableFunds.toFixed(2)}`;
            document.getElementById('total-invested').textContent = `$0.00`;
            document.getElementById('portfolio-value').textContent = `$0.00`;
            document.getElementById('total-gain-loss').textContent = `${user.portfolio.realizedGainLoss.toFixed(2)}`;
            document.getElementById('balance').textContent = `$${user.portfolio.availableFunds.toFixed(2)}`;
            tbody.innerHTML = '<tr><td colspan="7">No Stock holdings</td></tr>';
            return;
        }

        // Fetch current prices for all stocks and compute overall portfolio statistics
        const currentPrices = await fetchCurrentPrices(stocks);
        const stats = calculatePortfolioStats(stocks, currentPrices);

        // Update portfolio summary elements (if present)
        document.getElementById('total-invested').textContent = `$${stats.totalInvestment.toFixed(2)}`;
        const portfolioValueEl = document.getElementById('portfolio-value');
        portfolioValueEl.textContent = `$${stats.totalValue.toFixed(2)}`;
        const gainLossEl = document.getElementById('total-gain-loss');
        gainLossEl.textContent = `$${user.portfolio.realizedGainLoss.toFixed(2)}`;
        gainLossEl.className = user.portfolio.realizedGainLoss.toFixed(2) >= 0 ? 'gain' : 'loss';

        // Render each stock row with current price and per-stock gain/loss
        let totalInvestment = 0;
        for (const stock of stocks) {
            const tr = document.createElement('tr');
            const currentPrice = currentPrices[stock.ticker] ?? stock.avgPrice ?? 0;
            const totalStockValue = stock.quantity * currentPrice;
            const stockInvestment = stock.quantity * stock.avgPrice;
            totalInvestment += stock.quantity * (stock.avgPrice);
            const gainLoss = (currentPrice - (stock.avgPrice)) * stock.quantity;
            const gainLossPercent = stock.avgPrice ? ((currentPrice - stock.avgPrice) / stock.avgPrice) * 100 : 0;

            tr.innerHTML = `
                <td class="ticker">${stock.ticker}</td>
                <td class="quantity">${stock.quantity}</td>
                <td class="avg-price">$${(stock.avgPrice).toFixed(2)}</td>
                <td class="total-cost">$${stockInvestment.toFixed(2)}</td>
                <td class="current-price">$${Number(currentPrice).toFixed(2)}</td>
                <td class="total-value">$${totalStockValue.toFixed(2)}</td>
                <td class="gain-loss" style="color:${gainLoss >= 0 ? 'green' : 'red'};">
                    ${gainLoss >= 0 ? '+' : ''}$${gainLoss.toFixed(2)} (${gainLossPercent.toFixed(2)}%)
                </td>
                <td class="sell-actions">
                    <div class="sell-controls" style="display: none;">
                        <input type="number" class="sell-quantity" 
                               min="1" max="${stock.quantity}" 
                               value="1" 
                               style="width: 60px; margin-right: 5px;">
                        <button class="confirm-sell" data-ticker="${stock.ticker}" 
                                data-price="${stock.avgPrice}">
                            Confirm
                        </button>
                        <button class="cancel-sell">Cancel</button>
                    </div>
                    <button class="sell-button">Sell</button>
                </td>
            `;
            tbody.appendChild(tr);

            // Wire up controls for the newly added row
            
            const sellButton = tr.querySelector('.sell-button');
            const sellControls = tr.querySelector('.sell-controls');
            const quantityInput = tr.querySelector('.sell-quantity');
            const confirmButton = tr.querySelector('.confirm-sell');
            const cancelButton = tr.querySelector('.cancel-sell');

            sellButton.addEventListener('click', () => {
                sellButton.style.display = 'none';
                sellControls.style.display = 'inline-block';
            });

            cancelButton.addEventListener('click', () => {
                sellControls.style.display = 'none';
                sellButton.style.display = 'inline-block';
            });

            confirmButton.addEventListener('click', async () => {
                try {
                    const quantity = parseInt(quantityInput.value);
                    if (quantity < 1 || quantity > stock.quantity) {
                        alert(`Please enter a quantity between 1 and ${stock.quantity}`);
                        return;
                    }

                    const response = await fetch("/api/sellStock", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            ticker: stock.ticker,
                            price: currentPrice,
                            quantity: quantity,
                            avgPrice: stock.avgPrice,
                        })
                    });

                    const data = await response.json();
                    if (data.success) {
                        await loadPortfolio();
                    } else {
                        alert('Failed to sell stock: ' + (data.message));
                    }
                } catch (error) {
                    console.error('Error selling stock:', error);
                    alert('Error selling stock. Please try again.');
                }
            });
        }

        document.getElementById('username').textContent = `${user.username}'s Portfolio`;
        document.getElementById('available-funds').textContent = `$${user.portfolio.availableFunds.toFixed(2)}`;
        document.getElementById('total-invested').textContent = `$${totalInvestment.toFixed(2)}`;
        const balance = Number(user.portfolio.availableFunds.toFixed(2)) + Number(stats.totalValue.toFixed(2));
        document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
    } catch (err) {
        console.error('Failed to load portfolio', err);
        document.getElementById('holdings-body').innerHTML = '<tr><td colspan="5">Error loading portfolio</td></tr>';
    }
}

// Initial load of portfolio data
loadPortfolio();

//Fetch current prices for all stocks
async function fetchCurrentPrices(stocks) {
    const prices = {};
    for (const stock of stocks) {
        try {
            const response = await fetch(`/api/quote/${stock.ticker}`);
            const data = await response.json();
            if (data.success && data.quote) {
                prices[stock.ticker] = parseFloat(data.quote['05. price'] || data.quote.price || 0);
            }
        } catch (error) {
            console.error(`Error fetching price for ${stock.ticker}:`, error);
        }
    }
    return prices;
}

// Calculate portfolio statistics for boxes on top displaying overall coverage
function calculatePortfolioStats(stocks, currentPrices) {
    let totalValue = 0;
    let totalInvestment = 0;
    
    stocks.forEach(stock => {
        const currentPrice = currentPrices[stock.ticker] || stock.avgPrice;
        const investment = stock.quantity * stock.avgPrice;
        const currentValue = stock.quantity * currentPrice;
        
        totalValue += currentValue;
        totalInvestment += investment;
    });
    
    return {
        totalValue,
        totalInvestment,
    };
}

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


module.exports = { loadPortfolio };