/**
 * @jest-environment jsdom
 */
describe("advanceSearch functions", () => {
  let modules;
  // Make Mock DOM for Jest Enviroment and set modules to contain functions to test
  beforeEach(() => {
    // Mock hTML elements that displays to user
    // Reset in order to test data changes to elements
    document.body.innerHTML = `
			<div class="search-container">
				<div class="row">
					<input id="input-box" />
					<button id="searchButton"></button>
				</div>
				<div id="searchResults" style="display:none">
					<ul id="result-list"></ul>
				</div>
			</div>
			<div class="stock-container" style="display:none">
				<div class="stock-details">
					<h2 id="stock-symbol"></h2>
					<p id="stock-open"></p>
					<p id="stock-high"></p>
					<p id="stock-low"></p>
					<p id="stock-price"></p>
					<p id="stock-volume"></p>
					<p id="stock-change"></p>
					<p id="stock-change-percent"></p>
					<p id="available-funds-buy"></p>
				</div>
				<form id="trade-form">
					<input id="trade-ticker" name="ticker" />
					<input id="trade-price" name="price" />
				</form>
			</div>
		`;
    // In order to test functions without the need for eventlisteners errors
    // We need to keep reimportant modules in advanceSearch.js
    // Then resetting mock for other test
    jest.resetModules();
    modules = require("../public/advanceSearch");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  // Test for correct data going to correct stock detail elements on setUpStockData function call
  test("setUpStockData correctly fills elements in stock details", () => {
    // Set up test data
    const testQuote = {
      "01. symbol": "ABC",
      "02. open": "10.00",
      "03. high": "12.00",
      "04. low": "9.50",
      "05. price": "11.25",
      "06. volume": "12345",
      "09. change": "1.25",
      "10. change percent": "12.5%",
    };
    // call setUpStockData function with test data
    modules.setUpStockData(testQuote);

    expect(document.getElementById("stock-symbol").textContent).toBe("ABC");
    expect(document.getElementById("stock-price").textContent).toContain(
      "$11.25"
    );
    expect(document.getElementById("trade-ticker").value).toBe("ABC");
    expect(document.getElementById("trade-price").value).toBe("11.25");
    expect(document.querySelector(".stock-container").style.display).toBe(
      "flex"
    );
  });
  // Test for array items becoming li items in ul element with correct data
  test("displayBestMatchResults displays li items", async () => {
    // li items to check for
    const bestMatches = [
      { "1. symbol": "FOO", "2. name": "Foo INC" },
      { "1. symbol": "BAR", "2. name": "Bar Corp" },
    ];

    // mock fetch results to handle api calls for quote and getFunds
    fetch = jest.fn((url) => {
      if (url.startsWith("/api/quote/")) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              success: true,
              quote: {
                "01. symbol": "FOO",
                "02. open": "1",
                "03. high": "2",
                "04. low": "0.5",
                "05. price": "1.5",
                "06. volume": "100",
                "09. change": "0.5",
                "10. change percent": "10%",
              },
            }),
        });
      }
      if (url === "/api/getFunds") {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, availableFunds: 500 }),
        });
      }
    });

    // check ul li items before displayBestMatchResults call
    const ul = document.getElementById("result-list");
    expect(ul.childNodes.length).toBe(0);

    modules.displayBestMatchResults(bestMatches);

    // check ul li items after displayBestMatchResults call to ensure content change
    expect(ul.childNodes.length).toBe(2);
    expect(ul.firstChild.textContent).toContain("FOO - Foo INC");
    // function called inside of displayBestMatchResults
    await modules.makeSearchRequest("FOO");

    // makeSearchRequest made two API calls so we check those calls were made
    // and that the right API calls were made
    expect(fetch).toHaveBeenCalledWith("/api/quote/FOO");
    expect(fetch).toHaveBeenCalledWith("/api/getFunds");

    // Check that changes match with what is returned in mock fetch
    expect(document.getElementById("stock-symbol").textContent).toBe("FOO");
    expect(
      document.getElementById("available-funds-buy").textContent
    ).toContain("Available funds: $500.00");
  });
  // Test empty inputs returns correct message
  test("makeSearchRequest shows message when input is empty", async () => {
    document.getElementById("result-list").innerHTML = "";
    await modules.makeSearchRequest("");
    const ul = document.getElementById("result-list");
    expect(ul.textContent).toBe("enter a ticker symbol");
    expect(document.getElementById("searchResults").style.display).toBe(
      "block"
    );
  });
  // Test for non-existent ticker symbol inputs
  test("makeSearchRequest with non-existent Ticker", async () => {
    const ul = document.getElementById("result-list");
    ul.innerHTML = "";
    // Mock fetche results dependent on API call with quote failure
    fetch = jest.fn((url) => {
      if (url.startsWith("/api/quote/")) {
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              success: false,
              message: "Ticker Symbol Not Found",
            }),
        });
      }
      if (url === "/api/getFunds") {
        return Promise.resolve({
          json: () =>
            Promise.resolve({ success: true, availableFunds: 123.45 }),
        });
      }
    });
    await modules.makeSearchRequest("<?");

    expect(fetch).toHaveBeenCalledWith("/api/quote/<?");
    expect(fetch).toHaveBeenCalledWith("/api/getFunds");
    expect(ul.textContent).toBe("Ticker Symbol not found");
    expect(document.getElementById("searchResults").style.display).toBe(
      "block"
    );
  });
  // Test for when available funds request fails
  test("makeSearchRequest with request failure for available funds", async () => {
    const ul = document.getElementById("result-list");
    ul.innerHTML = "";
    // Mock fetche results dependent on API call with getFunds failure
    fetch = jest.fn((url) => {
      if (url.startsWith("/api/quote/")) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, quote: [] }),
        });
      }
      if (url === "/api/getFunds") {
        return Promise.resolve({
          json: () =>
            Promise.resolve({ success: false, message: "User not found" }),
        });
      }
    });
    await modules.makeSearchRequest("<?");

    expect(fetch).toHaveBeenCalledWith("/api/quote/<?");
    expect(fetch).toHaveBeenCalledWith("/api/getFunds");
    expect(ul.textContent).toBe("User not found");
    expect(document.getElementById("searchResults").style.display).toBe(
      "block"
    );
  });
  // Test that data is populated in correct elements
  test("makeSearchRequest correctly calls setUpStockData", async () => {
    const ul = document.getElementById("result-list");
    ul.innerHTML = "<li>XYZ - XYZ INC</li>";

    const sampleQuote = {
      "01. symbol": "XYZ",
      "02. open": "5.00",
      "03. high": "6.00",
      "04. low": "4.50",
      "05. price": "5.50",
      "06. volume": "2000",
      "09. change": "0.5",
      "10. change percent": "10%",
    };
    // Mock fetche results dependent on API call with both success
    fetch = jest.fn((url) => {
      if (url.startsWith("/api/quote/")) {
        return Promise.resolve({
          json: () => Promise.resolve({ success: true, quote: sampleQuote }),
        });
      }
      if (url === "/api/getFunds") {
        return Promise.resolve({
          json: () =>
            Promise.resolve({ success: true, availableFunds: 123.45 }),
        });
      }
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });

    await modules.makeSearchRequest("XYZ");

    expect(fetch).toHaveBeenCalledWith("/api/quote/XYZ");
    expect(fetch).toHaveBeenCalledWith("/api/getFunds");
    expect(document.getElementById("stock-symbol").textContent).toBe("XYZ");
    expect(
      document.getElementById("available-funds-buy").textContent
    ).toContain("Available funds: $123.45");
    expect(document.getElementById("input-box").value).toBe("");
    expect(document.getElementById("searchResults").style.display).toBe("none");
  });
  // Test that the li items in list are hidden when input is either reduced to 1/0 or start with 1/0 characters
  test("getStockRecommendations hides results when input is less than 2", () => {
    // For short inputs, hideResults should clear the list and hide the results container
    const ul = document.getElementById("result-list");
    ul.innerHTML = "<li>IBM - IBM</li>";
    modules.getStockRecommendations("A");
    expect(ul.childNodes.length).toBe(0);
    expect(document.getElementById("searchResults").style.display).toBe("none");
  });
  // Test that hideResults removes li items when called
  test("hideResults clears the result list and hides container", () => {
    const ul = document.getElementById("result-list");
    ul.innerHTML = "<li>IBM - IBM</li>";
    modules.hideResults();
    expect(ul.childNodes.length).toBe(0);
    expect(document.getElementById("searchResults").style.display).toBe("none");
  });
});
