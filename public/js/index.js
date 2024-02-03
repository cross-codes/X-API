const url = "https://x-api-3g2k.onrender.com";
const route = "/tweets";
const opts = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
};

async function renderTweets() {
  try {
    const response = await fetch(url + route, opts);
    const tweets = await response.json();
    console.log(tweets);
    const tweetsContainer = document.getElementById("tweets-container");
    tweetsContainer.innerHTML = "";

    tweets.forEach(function(tweet) {
      const tweetElement = document.createElement("div");
      tweetElement.classList.add("tweet-box");

      tweetElement.innerHTML = `
        <p class="tweet-author"><strong>${tweet.username}</strong></p>
        <p>${tweet.content}</p>
        <p class="tweet-date">${tweet.updatedAt}</p>
      `;
      tweetsContainer.appendChild(tweetElement);
    });
  } catch (e) {
    console.error("Error fetching tweets: " + e.message);
  }
}

document.addEventListener("DOMContentLoaded", renderTweets());

document.getElementById("signin-btn").addEventListener("click", function() {
  window.location.href = "../templates/signin.html";
});

document.getElementById("login-btn").addEventListener("click", function() {
  window.location.href = "../templates/login.html";
});

// Extra code for the OAuth will be put here
