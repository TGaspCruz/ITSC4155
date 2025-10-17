let signupForm = document.getElementById("signupForm");
let signupMessage = document.getElementById('signupMessage');


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
        if (!response.ok) {
            throw new Error(`Server issue ${searchResponse.status}`);
        }
        const payload = await response.json();

        console.log('Response payload:', payload);
        if (response.ok) {
            // Successful registration signupMessage and redirect to dashboard
            signupMessage.style.color = 'green';
            signupMessage.textContent = payload.message || 'Signup successful';
            setTimeout(() => { window.location.href = payload.redirect; }, 600);
        
        } else {
            // Display error signupMessage from server
            signupMessage.style.color = 'red';
            signupMessage.textContent = payload.message || `Error: ${response.status}`;
        }
    } catch (err) {
        console.error('Fetch error', err);
        signupMessage.style.color = 'red';
        signupMessage.textContent = 'Network error. Please try again.';
    }
});