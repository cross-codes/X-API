const url = "https://x-api-3g2k.onrender.com";
const profileRoute = "/users/me";
const profileOpts = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  },
};

async function getUsername() {
  try {
    const response = await fetch(url + profileRoute, profileOpts);

    if (response.ok) {
      const data = await response.json();
      console.log(data);
      return data.username;
    } else {
      console.error("Error fetching username", response.statusText);
    }
  } catch (e) {
    console.error("Error fetching username: ", e.message);
  }
}

const renderRoute = "/tweets";
const renderOpts = {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
};

const deleteRoute = "/tweets/";
const deleteOpts = {
  method: "DELETE",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  },
};

async function deleteTweet(tweetId) {
  try {
    const response = await fetch(url + deleteRoute + `${tweetId}`, deleteOpts);
    if (response.ok) {
      await renderTweetsAndWelcome();
    } else {
      console.error("Error deleting tweet: ", response.statusText);
    }
  } catch (e) {
    console.error("Error deleting tweet: ", e.message);
  }
}

function updateRedirect(tweetId) {
  localStorage.setItem("tweetID", tweetId);
  window.location.href = "../templates/update.html";
}

async function deleteRedirect(tweetId) {
  const confirmation = window.confirm("Do you really want to delete the tweet");
  if (confirmation) {
    await deleteTweet(tweetId);
  } else {
    console.log("Deletion aborted");
  }
}

async function renderTweetsAndWelcome() {
  try {
    const response = await fetch(url + renderRoute, renderOpts);
    const tweets = await response.json();
    console.log(tweets);
    const tweetsContainer = document.getElementById("tweets-container");
    tweetsContainer.innerHTML = "";

    tweets.forEach(async function(tweet) {
      const tweetElement = document.createElement("div");
      tweetElement.classList.add("tweet-box");
      const isAuthor = tweet.username === await getUsername();

      tweetElement.innerHTML = `
        <p class="tweet-author"><strong>${tweet.username}</strong></p>
        <p>${tweet.content}</p>
        <p class="tweet-date">${tweet.updatedAt}</p>
        ${isAuthor ? `<button class="update-button" onclick="updateRedirect('${tweet._id}')">Update</button>` : ""}
        ${isAuthor ? `<button class="delete-button" onclick="deleteRedirect('${tweet._id}')">Delete</button>` : ""}
      `;
      tweetsContainer.appendChild(tweetElement);
    });

    const welcomeMessage = document.getElementById("welcome-message");
    const username = await getUsername();
    welcomeMessage.textContent = `Welcome ${username}`;
  } catch (e) {
    console.error("Error fetching tweets: " + e.message);
  }
}

const logoutRoute = "/users/logout";
const logoutOpts = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  },
};

async function logout() {
  try {
    const response = await fetch(url + logoutRoute, logoutOpts);
    if (response.ok) {
      window.location.href = "../index.html";
    } else {
      console.error("Error logging out: ", response.statusText);
    }
  } catch (e) {
    console.error("Error logging out: ", e.message);
  }
}

document.getElementById("post-button").addEventListener("click", function() {
  console.log("Post button clicked");
  window.location.href = "../templates/post.html";
});

document.getElementById("logout-button").addEventListener("click", async function() {
  console.log("Logout button clicked");
  const confirmation = window.confirm("Do you really want to logout");
  if (confirmation) {
    await logout();
  } else {
    console.log("Logout aborted");
  }
});

document.addEventListener("DOMContentLoaded", async function() {
  await renderTweetsAndWelcome();
});
