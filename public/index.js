// function testJest(variable) {
//     return variable;
// }

// const { set } = require("../app");
let loginForm = document.getElementById("loginForm");
let message = document.getElementById('loginMessage');


loginForm.addEventListener("submit", async function(event) {
    event.preventDefault(); // Prevent the default form submission
    
    const formData = new FormData(loginForm);
    const data = {
        email: formData.get("email"),
        password: formData.get("password")
    };

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const payload = await response.json();

        console.log('Response payload:', payload);
        if (response.ok) {
            // Successful login message and redirect to dashboard
            message.style.color = 'green';
            message.textContent = payload.message || 'Login successful';
            setTimeout(() => { window.location.href = payload.redirect || '/dashboard'; }, 600);
        } else {
            // Display error message from server
            message.style.color = 'red';
            message.textContent = payload.message || `Error: ${response.status}`;
        }
    } catch (err) {
        console.error('Fetch error', err);
        message.style.color = 'red';
        message.textContent = 'Network error. Please try again.';
    }
});

//module.exports = testJest