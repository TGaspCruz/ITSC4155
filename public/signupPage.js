const signupForm = document.getElementById("signupForm");
const signupMessage = document.getElementById('signupMessage');
// Attach listener in browser runtime
if (signupForm) {
    signupForm.addEventListener('submit', (e) => handleSignup(e, signupForm, signupMessage));
}

async function handleSignup(event, signupForm, signupMessage, fetchFn = fetch,) {
    event.preventDefault();

    const formData = new FormData(signupForm);
    const data = {
        username: formData.get("username"),
        email: formData.get("email"),
        password: formData.get("password")
    };

    try {
        const response = await fetchFn('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const payload = await response.json();

        console.log('Response payload:', payload);
        if (response.ok) {
            // Successful registration
            signupMessage.style.color = 'green';
            signupMessage.textContent = payload.message;
            setTimeout(() => { window.location.href = payload.redirect; }, 600)
        } else {
            // Display error message from server
            signupMessage.style.color = 'red';
            signupMessage.textContent = payload.message;
        }
    } catch (err) {
        signupMessage.style.color = 'red';
        signupMessage.textContent = 'Network error. Please try again.';
    }
}

module.exports = { handleSignup };

