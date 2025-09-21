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

        // Try to parse JSON if possible, otherwise fallback to text
        let payload;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            payload = await response.json();
        } else {
            payload = { message: await response.text() };
        }
        console.log('Response payload:', payload);
        if (response.ok) {
            // On success the server may request a redirect. If server returned a redirect URL in JSON, follow it.
            message.style.color = 'green';
            message.textContent = payload.message || 'Signup successful';
            if (payload.redirect) {
                // small delay so user can see message
                setTimeout(() => { window.location.href = payload.redirect; }, 600);
            } else {
                // if server used HTTP redirect instead of JSON, follow it manually
                if (response.status === 200 && !payload.redirect) {
                    // Best-effort: go to /dashboard
                    setTimeout(() => { window.location.href = '/'; }, 600);
                }
            }
        } else {
            message.style.color = 'red';
            message.textContent = payload.message || `Error: ${response.status}`;
        }
    } catch (err) {
        console.error('Fetch error', err);
        message.style.color = 'red';
        message.textContent = 'Network error. Please try again.';
    }
});