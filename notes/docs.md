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
  - OAuth should be implemented (new)

---

## Details

- The packages are managed using corepack enabled `Yarn v4`. There are
  no `node_modules`, so LSPs are compromised for library definitions, but
  the pnp functionality makes the project lighter.
- The DB used is `MongoDB @ 7.0.3` with `Mongosh @ 2.0.2`. The DB names are:
  - `tweet-api` @ `mongodb://0.0.0.0:27017/tweet-api`
  - `tweet-api-test` @ `mongodb://0.0.0.0:27017/tweet-api-test`

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

```json
{
  "name": ...,
  "version": ...,
  "packageManager": "yarn@4.0.2",
  "description": ...,
  "author": ...,
  "private": ...,
  "license": ...,
  "type": "module",
  "scripts": {
    "start": ...,
    "dev": ...,
    ...
  },
  "dependencies": {
      ...
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

mongoose.connection.on("error", (err) => {
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

app.listen(port, (err) => {
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

export const Tweet = mongoose.model("Tweet", tweetSchema);
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
