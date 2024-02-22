import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import validator from "validator";
import Tweet from "./tweet.model.js";

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

// Validation logic

// (1) Prevent password "password"
userSchema.path("password").validate(function(val) {
  return !val.toLowerCase().includes("password");
}, "Please use a stronger password");

// (2) Ensure a valid email address is entered
userSchema.path("email").validate(function(val) {
  return validator.isEmail(val);
}, "Email is invalid");

// Pre-event hooks

// (1) Hash passwords before event "save"
userSchema.pre("save", async function(next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8); // Store hashed passwords in the DB on modification or new creation
  }
});

// (2) Cascade tweets before event "delete"
userSchema.pre("remove", async function(next) {
  await Tweet.deleteMany({ author: this._id });
  next();
});

// (3) Update tweets if the username is updated
userSchema.pre("save", async function(next) {
  if (this.isModified("username")) {
    await Tweet.updateMany({ author: this._id }, { $set: { username: this.username } });
    next();
  }
});

// (4) Update comments if the username is updated
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

// Virtuals

// (1) Enable access to a user's tweets as if it is a property of the user
userSchema.virtual("tweets", {
  ref: "Tweet",
  localField: "_id",
  foreignField: "author",
});

// Document specific methods

// (1) Generate an authentication token for a specific user
userSchema.methods.generateAuthToken = async function() {
  const token = jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET);
  this.tokens = this.tokens.concat({ token }); // Store all tokens in an array to enable login on multiple devices
  await this.save();

  return token;
};

// (2) Ensure API response does not contain sensitive information
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();

  // Delete the following sensitive fields
  delete userObject.password;
  delete userObject.tokens;

  return userObject;
};

// Statics (Model specific)

// (1) Query the collection to find a user by their credentials, presumably entered by the client
userSchema.statics.findByCredentials = async function(username, password) {
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

const User = mongoose.model("User", userSchema);

export default User;
