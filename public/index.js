// function testJest(variable) {
//     return variable;
// }

// login form submission handler
// let loginForm = document.getElementById("loginForm");
// let loginMessage = document.getElementById('loginMessage');


// loginForm.addEventListener("submit", async function(event) {
//     event.preventDefault(); // Prevent the default form submission
    
//     const formData = new FormData(loginForm);
//     const data = {
//         email: formData.get("email"),
//         password: formData.get("password")
//     };

//     try {
//         const response = await fetch('/login', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(data)
//         });

//         const payload = await response.json();

//         console.log('Response payload:', payload);
//         if (response.ok) {
//             // Successful login loginMessageand redirect to dashboard
//             loginMessage.style.color = 'green';
//             loginMessage.textContent = payload.message|| 'Login successful';
//             setTimeout(() => { window.location.href = payload.redirect || '/dashboard'; }, 600);
//         } else {
//             // Display error loginMessagefrom server
//             loginMessage.style.color = 'red';
//             loginMessage.textContent = payload.message|| `Error: ${response.status}`;
//         }
//     } catch (err) {
//         console.error('Fetch error', err);
//         loginMessage.style.color = 'red';
//         loginMessage.textContent = 'Network error. Please try again.';
//     }
// });

//module.exports = testJest

// index.js
async function handleLogin(event, loginForm, loginMessage, fetchFn = fetch) {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const data = {
        email: formData.get("email"),
        password: formData.get("password")
    };

    try {
        const response = await fetchFn('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const payload = await response.json();

        if (response.ok) {
            loginMessage.style.color = 'green';
            loginMessage.textContent = payload.message || 'Login successful';
            setTimeout(() => { window.location.href = payload.redirect || '/dashboard'; }, 600);
        } else {
            loginMessage.style.color = 'red';
            loginMessage.textContent = payload.message || `Error: ${response.status}`;
        }
    } catch (err) {
        loginMessage.style.color = 'red';
        loginMessage.textContent = 'Network error. Please try again.';
    }
}

if (typeof document !== 'undefined') {
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById('loginMessage');
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => handleLogin(e, loginForm, loginMessage));
    }
}

module.exports = { handleLogin };
