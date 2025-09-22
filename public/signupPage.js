let signupForm = document.getElementById("signup-form");
let message = document.getElementById('signupMessage');


signupForm.addEventListener("submit", async function(event) {
    event.preventDefault(); // Prevent the default form submission
    
    const formData = new FormData(signupForm);
    const data = {
        username: formData.get("username"),
        email: formData.get("email"),
        password: formData.get("password")
    };

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const payload = await response.json();

        console.log('Response payload:', payload);
        if (response.ok) {
            // Successful registration message and redirect to dashboard
            message.style.color = 'green';
            message.textContent = payload.message || 'Signup successful';
            setTimeout(() => { window.location.href = payload.redirect; }, 600);
        
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