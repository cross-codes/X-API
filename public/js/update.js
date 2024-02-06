const url = "https://x-api-3g2k.onrender.com";
const tweetRoute = "/tweets/";
const tweetOpts = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  },
};

document.addEventListener("DOMContentLoaded", async function() {
  try {
    const response = await fetch(url + tweetRoute + `${localStorage.getItem("tweetID")}`, tweetOpts);
    if (response.ok) {
      const tweet = await response.json();
      const tweetContent = tweet.content;

      document.getElementById("tweet-content").value = tweetContent;
    } else {
      console.error("Error fetching original tweet: ", response.statusText);
    }
  } catch (e) {
    console.error("Error fetching original tweet: ", e.message);
  }
});

const updateRoute = "/tweets/";
const updateOpts = {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  },
};

document.getElementById("update-form").addEventListener("submit", async function(event) {
  event.preventDefault();

  const tweetContent = document.getElementById("tweet-content").value;
  updateOpts.body = JSON.stringify({ content: tweetContent });

  try {
    const response = await fetch(url + updateRoute + `${localStorage.getItem("tweetID")}`, updateOpts);

    if (response.ok) {
      window.location.href = "../templates/dashboard.html";
    } else {
      console.error("Error updating tweet: ", response.statusText);
    }
  } catch (e) {
    console.error("Error updating tweet: ", e.message);
  }
});
