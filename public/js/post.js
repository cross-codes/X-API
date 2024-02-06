const url = "https://x-api-3g2k.onrender.com";
const route = "/tweets";
const opts = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  },
};

document.getElementById("post-form").addEventListener("submit", async function(event) {
  event.preventDefault();

  const tweetContent = document.getElementById("tweet-content").value;
  opts.body = JSON.stringify({ content: tweetContent });

  try {
    const response = await fetch(url + route, opts);
    console.log(response);

    if (response.ok) {
      window.location.href = "../templates/dashboard.html";
    } else {
      console.error("Error posting tweet: ", response.statusText);
    }
  } catch (e) {
    console.error("Error posting tweet: ", e.message);
  }
});
