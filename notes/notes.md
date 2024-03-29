# X-API - Scaled down

## Primary Objectives

Build an X Clone (scaled down):

- API architecture: REST

- Models:

  - User: Required features - CRUD (!)
    - Username - UNIQUE
    - Email - UNIQUE
    - Password - HASHED
  - Tweet: Required features - CRUD (!)
    - Author - Foreign Key - Username
    - Content
    - TimeHMS stamp

- Behaviour:

  - Tweets should be editable by the users that made them
  - Every tweet should be viewable by everybody else

---

## Details

- The packages are managed using corepack enabled `Yarn v4`. There are
  no `node_modules`, so LSPs are compromised for library definitions, but
  the pnp functionality makes the project lighter.
- The DB used is `MongoDB @ 7.0.3` with `Mongosh @ 2.0.2`.
  The DB names used during development are docker containers:
  - `x-api` @ `mongodb://0.0.0.0:27017/x-api`
  - `x-api-test` @ `mongodb://0.0.0.0:27017/x-api-test`

---

## Approach

### Initializing project

(i) Start by setting up your project with yarn

```bash
corepack enable
yarn init -2
```

(ii) Modify the `.gitignore` file to enable zero-installs by commenting out `.pnp`,
and then run the following command

```bash
yarn config set enableGlobalCache false
```

(iii) Add any linter and formatting configuration files. Create the `.env` file along
with the `src/` and `.github/` folders, and modify the package.json file with
optional fields.

```JSON
{
  "name": "...",
  "version": "...",
  "packageManager": "yarn@4.0.2",
  "description": "...",
  "author": "...",
  "private": "...",
  "license": "...",
  "type": "module",
  "scripts": {
    "start": "...",
    "serverDev": "...",
    "websiteDev": "...",
  },
  "dependencies": {
  }
}
```

(iv) Modify .gitattributes and any other dotfiles as necessary

### Setting up the database

As stated earlier, the project uses MongoDB in conjunction with MongoSH and mongoose.

For local development you may use a docker container for your DB if you are
unable to get the client on your local machine.

### Creating the API

(i) Create the following in your `src/` folder:

- `db/` (For the settings related to the database connection)
- `middleware/` (For the JWT token and password hashing verification middleware)
- `models/` (For storing the schemas of the user and tweet models)
- `routers/` (For storing the various routes supported by this API)
- `app.js` (Code that stores the app functionality)
- `index.js` (Start point for the server)

(ii) Set up the connection:

Ensure your monogo client is connected and running. Create the file `db/connection.js`,
and set the following

```javascript
// db/connection.js

import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const opts = {
  serverSelectionTimeoutMS: 30000,
};

mongoose.connect(process.env.MONGODB_URI, opts);

mongoose.connection.on("error", function (err) {
  console.error(`\x1b[31m\x1b[1mMongoDB connection error: ${err}\x1b[0m`);
});
```

Since this is the true startpoint for the code, we import and use `dotenv` here.

(iii) Now ensure your app enables the connection

```javascript
// app.js

import express from "express";

import "./db/connection.js";

const app = express();

app.use(express.json());

export default app;
```

and call this in your server:

```javascript
// index.js

import app from "./app.js";

const port = process.env.PORT || 3000;

app.listen(port, function (err) {
  if (err) console.error(err);
  console.log(`Server is up on port: ${port}`);
});
```

(iv) Next create the files `models/user.model.js` and `models/tweet.model.js`

The tweet model will be as defined here:

```javascript
// tweet.model.js

import mongoose from "mongoose";

const tweetSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    username: {
      type: String,
      required: true,
      ref: "User",
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    pictures: [
      {
        type: String,
        trim: true,
        required: false,
      },
    ],
    videos: [
      {
        type: String,
        trim: true,
        required: false,
      },
    ],
  },
  { timestamps: true },
);

const Tweet = mongoose.model("Tweet", tweetSchema);
export default Tweet;
```

The user model will be as defined here:

```javascript
// models/user.model.js

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minLength: 8,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
      },
    ],
    avatar: {
      type: String,
      trim: true,
      required: false,
    },
  },
  { timestamps: true },
);
```

Furthermore, the file should also contain some business logic:

- Validation

```javascript
// Validation logic

// (1) Prevent password "password"
userSchema.path("password").validate(function (val) {
  return !val.toLowerCase().includes("password");
}, "Please use a stronger password");

// (2) Ensure a valid email address is entered
userSchema.path("email").validate(function (val) {
  return validator.isEmail(val);
}, "Email is invalid");
```

- Pre-event hooks

```javascript
// (1) Hash passwords before event "save"
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8); // Store hashed passwords in the DB on modification or new creation
  }
  next();
});

// (2) Cascade tweets before event "delete"
userSchema.pre("remove", async function (next) {
  await Tweet.deleteMany({ author: this._id });
  next();
});
```

- Virtuals

```javascript
// (1) Enable access to a user's tweets as if it is a property of the user
userSchema.virtual("tweets", {
  ref: "Tweet",
  localField: "_id",
  foreignField: "author",
});
```

- Document methods

```javascript
// Document specific methods

// (1) Generate an authentication token for a specific user
userSchema.methods.generateAuthToken = async function () {
  const token = jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET);
  this.tokens = this.tokens.concat({ token }); // Store all tokens in an array to enable login on multiple devices
  await this.save();

  return token;
};

// (2) Ensure API response does not contain sensitive information
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();

  // Delete the following sensitive fields
  delete userObject.password;
  delete userObject.tokens;
  delete userObject.avatar;

  return userObject;
};
```

- Model specific statics

```javascript
// Statics (Model specific)

// (1) Query the collection to find a user by their credentials, presumably entered by the client
userSchema.statics.findByCredentials = async function (username, password) {
  const user = await User.findOne({ username });

  if (!user) {
    throw new Error("Unable to login");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Unable to login");
  }

  return user;
};
```

and finally, add an export statement at the bottom

```javascript
export const User = mongoose.model("User", userSchema);
```

(v) Create middleware for authorization.

Create a file `middleware/auth.js` that handles user authroization using JWT tokens

```javascript
// middleware/auth.js

import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const authMiddle = async function (req, res, next) {
  try {
    // Remove the `Bearer` from the Authorization header
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

    if (!user) {
      throw new Error("User not found");
    }
    // Add a token and a user field to the request, to be used by the server
    req.token = token;
    req.user = user;
    next();
  } catch (e) {
    res.status(401).send({ error: "Authorization Failed" });
  }
};

export default authMiddle;
```

(vi) Create routers for the server. Start by making `routers/
user.router.js` and `routers/tweet.router.js`

First we work with the tweet routes. Import all the tweet model and the
authorization middleware, and initialise a new express router:

```javascript
// routers/tweet.router.js

import express from "express";
import authMiddle from "../middleware/auth.js";
import Tweet from "../models/tweet.model.js";

const tweetRouter = new express.Router();
```

Now in accordance with CRUD, define POST, GET, PATCH and DELETE operations

- POST

Under `{{url}}/tweets`, send a request body with the following content

```JSON
{
    "content": "...",
    "pictures": "...",
    "videos": "..."
}
```

ensure that an authorization header is sent with the appropriate Bearer token

```javascript
tweetRouter.post("/tweets", authMiddle, async function (req, res) {
  // Add an author  and username attribute to the request to complete the tweet schema requirements
  const tweet = new Tweet({
    ...req.body,
    author: req.user._id,
    username: req.user.username,
  });

  try {
    await tweet.save();
    res.status(201).send(tweet);
  } catch (e) {
    res.status(400).send({ error: "Malformed request" });
  }
});
```

- GET

Use the URL: `{{url}}/tweets?sortBy=parts[0]:parts[1]&limit={}&skip={}&username={}`

```javascript
tweetRouter.get("/tweets", async function (req, res) {
  const sort = {};

  if (req.query.sortBy) {
    // req.query would have /tweets?sortBy=parts[0]:parts[1]...
    const parts = req.query.sortBy.split(":");
    // Not dot notation because parts[0] needs to be dynamically computed
    sort[parts[0]] = parts[1] === "desc" ? -1 : 1;
  } else {
    sort.createdAt = -1;
  }

  const limit = parseInt(req.query.limit) || 10;
  const skip = parseInt(req.query.skip) || 0;

  try {
    if (req.query.username) {
      const tweets = await Tweet.find({ username: req.query.username })
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .exec();
      res.status(200).send(tweets);
    } else {
      const tweets = await Tweet.find({})
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .exec();
      res.status(200).send(tweets);
    }
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});
```

Use the URL: `{{url}}/tweets/:id`

```javascript
tweetRouter.get("/tweets/:id", async function (req, res) {
  const _id = req.params.id;

  try {
    const tweet = await Tweet.findOne({ _id });
    if (!tweet) {
      return res.status(404).send({ error: "Tweet not found" });
    }
    res.status(200).send(tweet);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});
```

- PATCH

Use the URL: `{{url}}/tweets/:id`

Ensure that an authorization header is sent with the appropriate Bearer token.
Your request body should look like:

```JSON
{
    "content": "...",
    "pictures": "...",
    "videos": "..."
}
```

```javascript
tweetRouter.patch("/tweets/:id", authMiddle, async function (req, res) {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["content", "pictures", "videos"];
  const isValidOperation = updates.every(function (update) {
    return allowedUpdates.includes(update);
  });

  if (!isValidOperation) {
    res.status(400).send({ error: "Attempt to update invalid fields" });
  }

  try {
    const tweet = await Tweet.findOne({
      _id: req.params.id,
      author: req.user._id,
      username: req.user.username,
    });
    if (!tweet) {
      return res.status(404).send({ error: "Tweet not found" });
    }
    updates.forEach(function (update) {
      tweet[update] = req.body[update];
    });
    await tweet.save();
    res.status(200).send(tweet);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});
```

- DELETE

Use the URL: `{{url}}/tweets/:id`

Ensure that an authorization header is sent with the appropriate Bearer token.

```javascript
tweetRouter.delete("/tweets/:id", authMiddle, async function (req, res) {
  try {
    const tweet = await Tweet.findOneAndDelete({
      _id: req.params.id,
      author: req.user._id,
      username: req.user.username,
    });

    if (!tweet) {
      return res.status(404).send({ error: "Tweet not found" });
    }
    res.send(tweet);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});
```

Make sure to export the tweetRouter.

Next we work with the user routes:

In `user.router.js` follow the same
initialization steps as shown previously

```javascript
import express from "express";
import authMiddle from "../middleware/auth.js";
import User from "../models/user.model.js";

const userRouter = new express.Router();
```

- POST

Use the URL `{{url}}/users`
Ensure the request has a body of the type:

```JSON
{
    "username": "...",
    "password": "...",
    "email": "..."
}
```

```javascript
userRouter.post("/users", async function (req, res) {
  // Obtain the new user information from the request
  const user = new User(req.body);
  try {
    // Try saving the user information, pre-event hook on save
    // will also trigger hashing the password
    await user.save();
    // Generate a JWT token for the user. It also additionally
    // modifies the tokens array for this user ('this')
    const token = await user.generateAuthToken();
    res.status(201).send({ user, token });
  } catch (e) {
    // Error messages are handled by the statics/methods
    res.status(400).send();
  }
});
```

Use the URL: `{{url}}/users/logout`

Ensure that an authorization header is sent with the appropriate Bearer token.

```javascript
userRouter.post("/users/logout", authMiddle, async function (req, res) {
  try {
    // Remove only the token that was used to login
    req.user.tokens = req.user.tokens.filter(function (token) {
      return token.token !== req.token;
    });
    await req.user.save();
    res.status(200).send();
  } catch (e) {
    console.error(e);
    res.status(500).send("Internal server error");
  }
});
```

Use the URL: `{{url}}/users/logoutAll`

Ensure that an authorization header is sent with the appropriate Bearer token.

```javascript
userRouter.post("/users/logoutAll", authMiddle, async function (req, res) {
  try {
    // Set the tokens array to an empty one
    req.user.tokens = [];
    await req.user.save();
    res.status(200).send();
  } catch (e) {
    console.error(e);
    res.status(500).send("Internal server error");
  }
});
```

Use the URL: `{{url}}/users/login`

Ensure the request has a body of the type:

```JSON
{
    "username": "...",
    "password": "..."
}
```

```javascript
userRouter.post("/users/login", async function (req, res) {
  try {
    const user = await User.findByCredentials(
      req.body.username,
      req.body.password,
    );
    // Generate a JWT token for the user. It also additionally
    // modifies the tokens array for this user ('this')
    const token = await user.generateAuthToken();
    res.status(200).send({ user, token });
  } catch (e) {
    res.status(400).send();
  }
});
```

- GET

Use the URL: `{{url}}/users/me`

Ensure that an authorization header is sent with the appropriate Bearer token.

```javascript
userRouter.get("/users/me", authMiddle, async function (req, res) {
  // After authMiddle, res.user uses the toJSON method which was
  // modified to remove sensitive information
  res.status(200).send(req.user);
});
```

Use the URL: `{{url}}/users/:id/avatar`

```javascript
userRouter.get("/users/:id/avatar", async function (req, res) {
  try {
    const user = await User.findById(req.params.id);

    if (!user || !user.avatar) {
      throw new Error();
    } else {
      res.status(200).send(user.avatar);
    }
  } catch (e) {
    res.status(404).send();
  }
});
```

- PATCH

Use the URL: `{{url}}/users/me`

Ensure that an authorization header is sent with the appropriate Bearer token.

```JSON
{
    "username": "...",
    "password": "...",
    "email": "..."
}
```

```javascript
userRouter.patch("/users/me", authMiddle, async function (req, res) {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["username", "password", "email", "avatar"];
  const isValidOperation = updates.every(function (update) {
    return allowedUpdates.includes(update);
  });

  if (!isValidOperation) {
    res.status(400).send({ error: "Attempt to update invalid fields" });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).send({ error: "User not found" });
    }

    if (updates.includes("username")) {
      const tweets = await Tweet.find({ author: req.user._id });
      tweets.forEach(async function (tweet) {
        tweet.username = req.body.username;
        await tweet.save();
      });
    }

    updates.forEach(function (update) {
      user[update] = req.body[update];
    });

    await user.save();
    res.status(200).send(user);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});
```

- DELETE

Use the URL: `{{url}}/users/me`

Ensure that an authorization header is sent with the appropriate Bearer token.

```javascript
userRouter.delete("/users/me", authMiddle, async function (req, res) {
  try {
    await req.user.remove();
    res.status(200).send(req.user);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});
```

Use the URL: `{{url}}/users/me/avatar`

Ensure that an authorization header is sent with the appropriate Bearer token.

```javascript
userRouter.delete("/users/me/avatar", authMiddle, async function (req, res) {
  try {
    req.user.avatar = undefined;
    await req.user.save();
    res.status(200).send({ message: "Profile picture removed" });
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});
```

Again, make sure to export the userRouter.

(vii) Take in the routers and enable them to be used by the server:

```javascript
// app.js

import express from "express";

import "./db/connection.js";
import tweetRouter from "./routers/tweet.router.js";
import userRouter from "./routers/user.router.js";

const app = express();

app.use(express.json());
app.use(userRouter);
app.use(tweetRouter);

export default app;
```

The sever is now equipped in theory.

---

### Deploying the API

Before implementing OAuth, we will first deploy the API online
For OAuth, it is best if we have a basic front end, so hosting the API online
is an effective way of doing this

(i) Making a DB on MongoDB Atlas

Create a new project in your account (say `X-API`) and deploy a new
M0 cluster with your current IP. Make sure there is one superuser with credentials.

Then connect to your instance using the NodeJS MongoDB driver ; since the
project uses mongoose (which has it's own implementation of the native
MongoDB driver), we only need the URI to replace in the `.env` file:

```bash
mongodb+srv://<username>:<password>@<project-name>.<cluster-id>.mongodb.net/?retryWrites=true&w=majority
```

Replace `<*>` fields with the appropriate entries from the user creation
process (or search/update it in `Database Access`)

Once deployed, start the server and create two users and a tweet via `Postman`
verify the updates

```bash
yarn run start
```

**Note**: If there is an error on accessing the DB, consider whitelisting ALL
IP Addresses to be able to access the database.

You can view your collections as shown below:

![Successfully created tweet](./img/atlas_success.png)
![Successfully created image](./img/atlas_success_2.png)

(2) Hosting the API as a web-service

Use a provider like `Heroku` or `Render` to host the API
as a web service. The reason for this decentralization is
two fold:

- (i) Since front-end development is not an ultimate priority,hosting the back-end
and the front-end separately ensures
that each service is reusable: Personally, I can reuse the
front-end for another rewrite or upgrade of the API

- (ii) During development, hosting the http-server and the
back-end (on `localhost:XXXX`) will lead to
Cross-origin resource sharing (CORS) blocks. We can develop
the front-end locally by making it interact with the
service that already hosted.

This API was hosted on [Render](https://x-api-3g2k.onrender.com)

(3) Install http-server as a dev dependency:

```bash
yarn add --dev http-server 
```

Create necessary scripts to separately run this service
(view the repository's `package.json` for the same)

(4) Create the following in a `public/` folder:

- `css/` (For the stylesheets)
- `fonts/` (For the monospace font that will be used in the webpage)
- `img/` (For storing any static images)
- `js/` (For the client side scripts)
- `templates` (For the HTML templates corresponding to the
websites available routes [except `index.html`])
- `index.html` (Start point for the server)

(5) Move a custom `.ttf` font into the `fonts/` directory

Make a corresponding stylesheet in `css/fontSet.css`

```css
@font-face {
  font-family: "JuliaMono";
  src: url("../font/JuliaMono-Regular.ttf") format("truetype");
}

* {
  font-family: "JuliaMono", sans-serif;
}
```

(6) Write the `index` page

`index.html` is the first page that the user sees at `/`,
and is also correspondingly the only page that any
`http-server` is usually able to access.

The following code will suffice for our design:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="css/fontSet.css">
    <link rel="stylesheet" href="css/index.css">
    <title>X-API Demo</title>
  </head>
  <body>
    <header>
      <h1>X-API Demo</h1>
      <div class="buttons-container">
        <button id="signin-btn">Sign Up</button>
        <button id="login-btn">Log In</button>
        <button id="google-btn">WIP</button>
      </div>
    </header>
    <div id="tweets-container"></div>
    <div id="message-container"></div>
    <script src="js/index.js"></script>
  </body>
</html>
```

The `id` attribute allows us to target them for further
customization with a CSS stylesheet (`css/index.css`)

The containers will be filled with out script in `js/index.js`

First the CSS can be updated as:

```css
body {
  margin: 20px;
}

header {
  text-align: center;
}

h1 {
  color: #161616;
}

.buttons-container {
  margin-top: 20px;
  text-align: center;
}

.tweet-box {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 20px;
  margin-top: 20px;
}

.tweet-author {
  font-weight: bold;
}

.tweet-date {
  color: #777;
}

button {
  margin-right: 10px;
  color: white;
  background-color: black;
}
```

and in `js/index.js`

```javascript
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
  window.location.href = "templates/signin.html";
});

document.getElementById("login-btn").addEventListener("click", function() {
  window.location.href = "templates/login.html";
});

// Extra code for the OAuth will be put here
```

We want to ensure that we don't bump into CORS when in development. This is
because the URL is in a different domain
from localhost:8080.

Install the cors library and add these lines

```javascript
import cors from "cors";
import express from "express";

import "./db/connection.js";
import tweetRouter from "./routers/tweet.router.js";
import userRouter from "./routers/user.router.js";

const corsOpts = {
  origin: ["http://localhost:8080", "https://x-api-demo-website.onrender.com"],
};

const app = express();

app.options("*", cors(corsOpts));
app.use(cors(corsOpts));

app.use(express.json());
app.use(userRouter);
app.use(tweetRouter);

export default app;
```

Here the second origin is the deployed front-end. Change accordingly

The first page should now be loadable.

Since we already have a user from the testing, let us
try to make the log in page

(7) Write the login page

Under templates, create a `login.html`. Create
corresponding `login.css` and `login.js` files

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../css/fontSet.css">
    <link rel="stylesheet" href="../css/login.css">
    <title>X-API Demo</title>
  </head>
  <body>
    <div class="login-container">
      <h1>Login</h1>
      <form id="login-form">
        <label for="username">Username:</label>
        <input type="username" id="username" name="username" required>
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required>
        <button type="submit">Login</button>
      </form>
      <div id="error-message"></div>
    </div>
    <script src="../js/login.js"></script>
  </body>
</html>
```

```css
body {
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.login-container {
  text-align: center;
}

h1 {
  margin-bottom: 20px;
}

form {
  width: 100%;
  max-width: 400px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  box-sizing: border-box; /* Include padding and border in the width */
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 8px;
  margin-bottom: 20px;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #161616;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  box-sizing: border-box;
}

@media (max-width: 600px) {
  form {
    max-width: none;
  }
}
```

```javascript
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
    console.error("Error during login: ", error.message);
  }
});
```

We cannot test this out yet, because we need to design the redirect page
`dashboard.html` to see it in action

(8) Design the login redirect page (Dashboard):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../css/fontSet.css">
    <link rel="stylesheet" href="../css/dashboard.css">
    <title>X-API Demo</title>
  </head>
  <body>
    <header>
      <h1>X-API Dashboard</h1>
      <div id="welcome-message"></div>
      <button id="profile-button" class="profile-button">Profile</button>
      <button id="logout-button" class="logout-button">Sign out</button>
    </header>
    <button id="post-button" class="post-button">Post</button>
    <div id="tweets-container"></div>
    <script src="../js/dashboard.js"></script>
  </body>
</html>
```

```css
body {
  font-family: Arial, sans-serif;
  margin: 20px;
  box-sizing: border-box;
}

header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

h1 {
  color: #1da1f2;
  margin-bottom: 10px;
}

.post-button {
  order: -1;
}

.post-button,
.logout-button,
.profile-button {
  width: 30%;
  margin: 0 35%;
  margin-top: 10px;
  box-sizing: border-box;
  background-color: #161616;
  color: white;
}

.tweet-box {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 20px;
  margin-top: 20px;
  position: relative;
}

.tweet-author {
  font-weight: bold;
}

.tweet-date {
  color: #777;
}

.update-button,
.delete-button {
  position: absolute;
  top: 10px;
  background-color: black;
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.update-button {
  right: 70px;
  background-color: green;
}

.delete-button {
  right: 10px;
  background-color: red;
}
```

```js
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
```

(9) Design the form updation page

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../css/fontSet.css">
    <link rel="stylesheet" href="../css/update.css">
    <title>X-API Demo</title>
  </head>
  <body>
    <header>
      <h1>Update tweet</h1>
    </header>
    <form id ="update-form">
      <label for="tweet-content">Tweet Content:</label>
      <textarea id="tweet-content" rows="4" cols="50"></textarea>
      <button type="submit" id="update-tweet-button">Update</button>
    </form>
    <script src="../js/update.js"></script>
  </body>
</html>
```

```css
body {
  font-family: Arial, sans-serif;
  margin: 20px;
}

header {
  text-align: center;
}

h1 {
  color: #161616;
}

#update-form {
  max-width: 600px;
  margin: 20px auto;
}

label {
  display: block;
  margin-bottom: 5px;
}

textarea {
  width: 100%;
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 5px;
  resize: none;
}

#update-tweet-button {
  background-color: #161616;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

#update-tweet-button:hover {
  background-color: #0d8ef9;
}
```

```js
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
```

(10) Design the post tweet page

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../css/fontSet.css">
    <link rel="stylesheet" href="../css/post.css">
    <title>X-API Demo</title>
  </head>
  <body>
    <header>
      <h1>Post Tweet</h1>
    </header>
    <form id="post-form">
      <label for="tweet-content">Tweet Content:</label>
      <textarea id="tweet-content" rows="4" cols="50"></textarea>
      <button type="submit" id="post-tweet-button">Post</button>
    </form>
    <script src="../js/post.js"></script>
  </body>
</html>
```

```css
body {
  margin: 20px;
}

header {
  text-align: center;
}

h1 {
  color: #161616;
}

#post-form {
  max-width: 600px;
  margin: 20px auto;
}

label {
  display: block;
  margin-bottom: 5px;
}

textarea {
  width: 100%;
  padding: 8px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 5px;
  resize: none;
}

#post-tweet-button {
  background-color: #161616;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

#post-tweet-button:hover {
  background-color: #0d8ef9;
}
```

```js
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
```

(11) Lastly, create the user creation page

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../css/fontSet.css">
    <link rel="stylesheet" href="../css/signup.css">
    <title>X-API Demo</title>
  </head>
  <body>
    <div class="signin=container">
      <h1>Sign Up</h1>
      <form id="signup-form">
        <label for="userName">Username:</label>
        <input type="userName" id="userName" name="userName" required>
        <label for="email">Email:</label>
        <input type="email" id="email" name="email" required>
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required>
        <button type="submit">Sign Up</button>
      </form>
      <div id="error-message"></div>
    </div>
    <script src="../js/signup.js"></script>
  </body>
</html>
```

```css
body {
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.signup-container {
  text-align: center;
}

h1 {
  margin-bottom: 20px;
}

form {
  width: 100%;
  max-width: 400px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

label {
  display: block;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 8px;
  margin-bottom: 20px;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 10px;
  background-color: #1da1f2;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  box-sizing: border-box;
}

@media (max-width: 600px) {
  form {
    max-width: none;
  }
}
```

```js
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
```

---

### Implementing OAuth

---

### Adding comments to the app

We want to now modify our schema for the tweet, to enable adding comments.

The process of updation will be done as follows:

(1) Update the tweet schema to include comments:

We only want to add a content, author and time attribute ; the new tweet schema will then become

```javascript
const tweetSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    username: {
      type: String,
      required: true,
      ref: "User",
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    pictures: [
      {
        type: String,
        trim: true,
        required: false,
      },
    ],
    videos: [
      {
        type: String,
        trim: true,
        required: false,
      },
    ],
    comments: [
      {
        content: {
          type: String,
          required: true,
        },
        author: {
          type: String,
          required: true,
          ref: "User",
        },
        datetime: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
)
```

(2) Next, we want to see how adding a comment looks like. We first update
the POST route.

Under `{{url}}/tweets/:tweetId/comments`, send a request body with the following content,
after sufficient authorization

```JSON
{
    "content": "...",
}
```

```javascript
tweetRouter.post("/tweets/:tweetId/comments", authMiddle, async function(req, res) {
  try {
    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) {
      res.status(404).send({ error: "Requested tweet not found" });
    }
    const user = await User.findById(req.user._id);
    tweet.comments.push({
      content: req.body.content,
      author: user.username,
      datetime: Date.now(),
    });
    await tweet.save();
    res.status(200).send(tweet);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});
```

(3) Next, we want to add a comments route to see the comments under a particular
tweet. This should not need any authorization.

Use the URL: `{{url}}/tweets/:tweetId/comments?sortByOrder={}&limit={}&skip={}`

```javascript
tweetRouter.get("/tweets/:tweetId/comments", async function(req, res) {
  const _id = req.params.tweetId;

  try {
    const tweet = await Tweet.findOne({ _id });
    if (!tweet) {
      return res.status(404).send({ error: "Tweet not found" });
    }

    const sortOrder = req.params.sortByOrder === "desc" ? -1 : 1;
    const commentsArray = tweet.comments.sort(function(a, b) {
      if (sortOrder === 1) {
        return a.datetime - b.datetime;
      } else {
        return b.datetime - a.datetime;
      }
    });
    const sentArray = [];

    let limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    if (limit > commentsArray.length) {
      limit = commentsArray.length;
    }

    for (let i = skip; i < limit; i++) {
      sentArray[i] = commentsArray[i];
    }
    res.status(200).send(sentArray);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});
```

(4) Deleting a comment should be the last task before we attempt the task of updation

Use the URL `{{url}}/tweets/:tweetId/comments/:commentId` and ensure sufficient authorization

```javascript
tweetRouter.delete("/tweets/:tweetId/comments/:commentId", authMiddle, async function(req, res) {
  try {
    const _tweetId = req.params.tweetId;
    const tweet = await Tweet.findOne({ _id: _tweetId });

    if (!tweet) {
      res.status(404).send({ error: "Tweet not found" });
    }

    if (tweet.author.toString() !== req.user._id.toString()) {
      throw new Error();
    }

    const commentsArray = tweet.comments;
    const _commentId = req.params.commentId;
    const commentIndex = commentsArray.findIndex(function(comment) {
      return comment._id.toString() === _commentId;
    });
    console.log(commentIndex);

    if (commentIndex === -1) {
      res.status(404).send({ error: "Comment not found" });
    }

    tweet.comments.splice(commentIndex, 1);

    await tweet.save();
    res.status(200).send(tweet);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});
```

(5) Now we modify add a new PATCH route to edit a comment

Use the URL: `{{url}}/tweets/:tweetId/comments/:commentId`

Ensure that an authorization header is sent with the appropriate Bearer token.
Your request body should look like:

```JSON
{
    "content": "...",
}
```

```javascript
tweetRouter.patch("/tweets/:tweetId/comments/:commentId", authMiddle, async function(req, res) {
  try {
    const tweet = await Tweet.findOne({ _id: req.params.tweetId });

    if (!tweet) {
      res.status(404).send({ error: "Tweet not found" });
    }

    if (tweet.author.toString() !== req.user._id.toString()) {
      throw new Error();
    }

    const commentsArray = tweet.comments;
    const _commentId = req.params.commentId;
    const commentIndex = commentsArray.findIndex(function(comment) {
      return comment._id.toString() === _commentId;
    });
    console.log(commentIndex);

    if (commentIndex === -1) {
      res.status(404).send({ error: "Comment not found" });
    }

    const comment = tweet.comments[commentIndex];
    comment.content = req.body.content;
    await tweet.save();
    res.status(200).send(tweet);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});

```

(6) The hidden thing to change is to update the attributes of a
comment when a user changes their username

Unfortunately, the process of manually scouring through every comment is painfully inefficient, so
we solve this problem by modifying our tweet model first:

For the comments, add an author attribute:

```javascript
const tweetSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    username: {
      type: String,
      required: true,
      ref: "User",
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    pictures: [
      {
        type: String,
        trim: true,
        required: false,
      },
    ],
    videos: [
      {
        type: String,
        trim: true,
        required: false,
      },
    ],
    comments: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "User",
        },
        content: {
          type: String,
          required: true,
        },
        username: {
          type: String,
          ref: "User",
          required: true,
        },
        datetime: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);
```

and now, update the POST request (ref (2)):

```javascript
tweetRouter.post("/tweets/:tweetId/comments", authMiddle, async function(req, res) {
  try {
    const tweet = await Tweet.findById(req.params.tweetId);
    if (!tweet) {
      res.status(404).send({ error: "Requested tweet not found" });
    }
    const user = await User.findById(req.user._id);
    tweet.comments.push({
      author: req.user._id,
      content: req.body.content,
      username: user.username,
      datetime: Date.now(),
    });
    await tweet.save();
    res.status(200).send(tweet);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});
```

To solve this problem, we will add a pre-event hook to "save" on the user:

```javascript
userSchema.pre("save", async function(next) {
  if (this.isModified("username")) {
    await Tweet.updateMany(
      { "comments.author": this._id },
      { $set: { "comments.$[elem].username": this.username } },
      { arrayFilters: [{ "elem.author": this._id }] },
    );
    next();
  }
});
```

As a matter of fact, we can use this pre-save hook method to update tweets on updating a username too

```javascript
userSchema.pre("save", async function(next) {
  if (this.isModified("username")) {
    await Tweet.updateMany({ author: this._id }, { $set: { username: this.username } });
    next();
  }
});
```

Remove the manual array travsersal method in the PATCH route for tweets.
