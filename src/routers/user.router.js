import express from "express";
import authMiddle from "../middleware/auth.js";
import User from "../models/user.model.js";

const userRouter = new express.Router();

// HTTP Method: POST

/**
 * Add a new user to the database
 */

// Status: Working as intended
userRouter.post("/users", async function(req, res) {
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

/**
 * Logout a user from their current active session on a device
 * This invalidates the most recent token associated with a user
 */

// Status: Working as intended
userRouter.post("/users/logout", authMiddle, async function(req, res) {
  try {
    // Remove only the token that was used to login
    req.user.tokens = req.user.tokens.filter(function(token) {
      return token.token !== req.token;
    });
    await req.user.save();
    res.status(200).send();
  } catch (e) {
    console.error(e);
    res.status(500).send("Internal server error");
  }
});

/**
 * Logout a user by removing all of their associated tokens
 */

// Status: Working as intended.
userRouter.post("/users/logoutAll", authMiddle, async function(req, res) {
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

/**
 * Login an existing user
 */

// Status: Working as intended
userRouter.post("/users/login", async function(req, res) {
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

// HTTP Method: GET

/**
 * Get insensitive user information after an authorization
 */

// Status: Working as intended
userRouter.get("/users/me", authMiddle, async function(req, res) {
  // After authMiddle, res.user uses the toJSON method which was
  // modified to remove sensitive information
  res.status(200).send(req.user);
});

/**
 * Get any user's profile picture
 */

// Status: Working as intended
userRouter.get("/users/:id/avatar", async function(req, res) {
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

// HTTP Method: PATCH

/**
 * Update valid fields in a user model
 * Must also update all the users associated tweets and comments
 */

// Status: Working as intended
userRouter.patch("/users/me", authMiddle, async function(req, res) {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["username", "password", "email", "avatar"];
  const isValidOperation = updates.every(function(update) {
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

    updates.forEach(function(update) {
      user[update] = req.body[update];
    });

    await user.save();
    res.status(200).send(user);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});

// HTTP Method: DELETE

/**
 * Delete a user
 */

// Status: Working as intended
userRouter.delete("/users/me", authMiddle, async function(req, res) {
  try {
    await req.user.remove();
    res.status(200).send(req.user);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * Delete a user's profile picture ('avatar')
 */

// Status: Working as intended
userRouter.delete("/users/me/avatar", authMiddle, async function(req, res) {
  try {
    req.user.avatar = undefined;
    await req.user.save();
    res.status(200).send({ message: "Profile picture removed" });
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});

export default userRouter;
