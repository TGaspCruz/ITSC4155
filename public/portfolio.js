// Fetch current prices for all stocks
// async function fetchCurrentPrices(stocks) {
//     const prices = {};
//     for (const stock of stocks) {
//         try {
//             const response = await fetch(`/api/quote/${stock.ticker}`);
//             const data = await response.json();
//             if (data.success && data.quote) {
//                 prices[stock.ticker] = parseFloat(data.quote['05. price'] || data.quote.price || 0);
//             }
//         } catch (error) {
//             console.error(`Error fetching price for ${stock.ticker}:`, error);
//         }
//     }
//     return prices;
// }

// Calculate portfolio statistics
// function calculatePortfolioStats(stocks, currentPrices) {
//     let totalValue = 0;
//     let totalInvestment = 0;
    
//     stocks.forEach(stock => {
//         const currentPrice = currentPrices[stock.ticker] || stock.avgPrice;
//         const investment = stock.quantity * stock.avgPrice;
//         const currentValue = stock.quantity * currentPrice;
        
//         totalValue += currentValue;
//         totalInvestment += investment;
//     });
    
//     const totalGainLoss = totalValue - totalInvestment;
//     const gainLossPercent = totalInvestment ? (totalGainLoss / totalInvestment) * 100 : 0;
    
//     return {
//         totalValue,
//         totalInvestment,
//         totalGainLoss,
//         gainLossPercent
//     };
// }

// Fetch and display logged in user portfolio data
async function loadPortfolio() {
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
            document.getElementById('available-funds').textContent = `$${(user.portfolio.availableFunds || 0).toFixed(2)}`;
            document.getElementById('total-invested').textContent = `$0.00`;
            tbody.innerHTML = '<tr><td colspan="7">No Stock holdings</td></tr>';
            return;
        }

        // Fetch current prices for all stocks
        //const currentPrices = await fetchCurrentPrices(stocks);
        //const stats = calculatePortfolioStats(stocks, currentPrices);

        // Update portfolio summary
        //document.getElementById('total-invested').textContent = `$${stats.totalInvestment.toFixed(2)}`;
        //document.getElementById('portfolio-value').textContent = `$${stats.totalValue.toFixed(2)}`;
        //const gainLossEl = document.getElementById('total-gain-loss');
        //gainLossEl.textContent = `$${stats.totalGainLoss.toFixed(2)} (${stats.gainLossPercent.toFixed(2)}%)`;
        //gainLossEl.className = stats.totalGainLoss >= 0 ? 'gain' : 'loss';
        let totalInvestment = 0;
        stocks.forEach(stock => {
            const tr = document.createElement('tr');
            //const currentPrice = currentPrices[stock.ticker] || stock.avgPrice;
            const totalStockValue = stock.quantity * stock.avgPrice;
            totalInvestment += totalStockValue;
            //const gainLoss = totalStockValue - (stock.quantity * stock.avgPrice);
            //const gainLossPercent = ((currentPrice - stock.avgPrice) / stock.avgPrice) * 100;
            
            tr.innerHTML = `
                <td>${stock.ticker}</td>
                <td>${stock.quantity}</td>
                <td>$${(stock.avgPrice || 0).toFixed(2)}</td>
                <td>$${totalStockValue.toFixed(2)}</td>
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

            // Get elements for this row
            const sellActions = tr.querySelector('.sell-actions');
            const sellButton = tr.querySelector('.sell-button');
            const sellControls = tr.querySelector('.sell-controls');
            const quantityInput = tr.querySelector('.sell-quantity');
            const confirmButton = tr.querySelector('.confirm-sell');
            const cancelButton = tr.querySelector('.cancel-sell');

            // Show sell controls when Sell is clicked
            sellButton.addEventListener('click', () => {
                sellButton.style.display = 'none';
                sellControls.style.display = 'inline-block';
            });

            // Hide controls when Cancel is clicked
            cancelButton.addEventListener('click', () => {
                sellControls.style.display = 'none';
                sellButton.style.display = 'inline-block';
            });

            // Validate quantity input
            quantityInput.addEventListener('change', () => {
                const value = parseInt(quantityInput.value);
                //if (value < 1) quantityInput.value = 1;
                //if (value > stock.quantity) quantityInput.value = stock.quantity;
            });

            // Handle confirm sell
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
                            price: stock.avgPrice,
                            quantity: quantity
                        })
                    });

                    const data = await response.json();
                    if (data.success) {
                        // Reload the portfolio to show updated state
                        loadPortfolio();
                    } else {
                        alert('Failed to sell stock: ' + (data.message || 'Unknown error'));
                    }
                } catch (error) {
                    console.error('Error selling stock:', error);
                    alert('Error selling stock. Please try again.');
                }
            });
        });
        document.getElementById('username').textContent = `${user.username}'s Portfolio`;
        document.getElementById('available-funds').textContent = `$${(user.portfolio.availableFunds || 0).toFixed(2)}`;
        document.getElementById('total-invested').textContent = `$${totalInvestment.toFixed(2)}`;
    } catch (err) {
        console.error('Failed to load portfolio', err);
        document.getElementById('holdings-body').innerHTML = '<tr><td colspan="5">Error loading portfolio</td></tr>';
    }
}

// Initial load of portfolio data
loadPortfolio();

// Logout handler
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await fetch('/logout', { method: 'POST' });
    } catch (err) {
        console.error('Logout failed', err);
    } finally {
        window.location.href = '/';
    }
});

// Get and display available funds
// async function getFunds() {
//     try {
//         const res = await fetch("/api/getFunds");
//         const data = await res.json();
//         if (data.success) {
//             document.getElementById("available-funds").textContent = 
//                 `$${(data.availableFunds || 0).toFixed(2)}`;
//         } else {
//             console.error("Failed to fetch funds:", data.message);
//         }
//     } catch (error) {
//         console.error("Error fetching funds:", error);
//     }
// }

// // Load funds on page load
// window.addEventListener("load", getFunds);