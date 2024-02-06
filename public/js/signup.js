const url = "https://x-api-3g2k.onrender.com";
const route = "/users";
const opts = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
};

document.getElementById("signup-form").addEventListener("submit", async function(event) {
  event.preventDefault();

  const username = document.getElementById("userName").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  opts.body = JSON.stringify({ username, password, email });

  try {
    const response = await fetch(url + route, opts);
    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("authToken", data.token);
      window.location.href = "../templates/dashboard.html";
    } else {
      console.error(data.message);
    }
  } catch (e) {
    console.error("Error during signin: ", e.message);
  }
});
