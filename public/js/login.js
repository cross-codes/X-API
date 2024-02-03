const url = "https://x-api-3g2k.onrender.com";
const route = "/users/login";
const opts = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
};

document.getElementById("login-form").addEventListener("submit", async function(event) {
  event.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  opts.body = JSON.stringify({ username, password });

  try {
    const response = await fetch(url + route, opts);
    const data = await response.json();
    if (response.ok) {
      console.log("Logged in successfully", data);
      localStorage.setItem("authToken", data.token);
      window.location.href = "../templates/dashboard.html";
    } else {
      console.error("Login failed: ", data.message);
      const errorMsgContainer = document.getElementById("error-message");
      errorMsgContainer.textContent = data.message;
      errorMsgContainer.style.color = "red";
      document.getElementById("username").value = "";
      document.getElementById("password").value = "";
    }
  } catch (e) {
    console.error("Error during login: ", e.message);
  }
});
