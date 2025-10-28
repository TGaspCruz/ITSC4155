const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
// Jest Test needs if statement to work
if (loginForm) {
  loginForm.addEventListener("submit", (e) =>
    handleLogin(e, loginForm, loginMessage)
  );
}
// Jest needs fetchFn in order to use mock API feature
async function handleLogin(event, loginForm, loginMessage, fetchFn = fetch) {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const data = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  try {
    const response = await fetchFn("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const payload = await response.json();

    if (response.ok) {
      loginMessage.style.color = "green";
      loginMessage.textContent = payload.message;
      setTimeout(() => {
        window.location.href = payload.redirect;
      }, 600);
    } else {
      loginMessage.style.color = "red";
      loginMessage.textContent = payload.message;
    }
  } catch (err) {
    loginMessage.style.color = "red";
    loginMessage.textContent = "Network error. Please try again.";
  }
}

module.exports = { handleLogin };
