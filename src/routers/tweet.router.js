import express from "express";
import authMiddle from "../middleware/auth.js";
import Tweet from "../models/tweet.model.js";
import User from "../models/user.model.js";

const tweetRouter = new express.Router();

// HTTP Method: POST

/**
 * Add a new tweet to the database
 */

// Status: Working as intended
tweetRouter.post("/tweets", authMiddle, async function(req, res) {
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

/**
 * Add a comment to a tweet
 */

// Status: Working as intended
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

// HTTP Method: GET

/**
 * View tweets uploaded by users
 */

// Status: Working as intended
tweetRouter.get("/tweets", async function(req, res) {
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

/**
 * View tweet by its object ID
 */

// Status: Working as intended
tweetRouter.get("/tweets/:id", async function(req, res) {
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

/**
 * View a comment under an associated tweet
 */

// Status: Working as intended
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

// HTTP Method: PATCH

/**
 * Update tweets after authorization
 */

// Status: Working as intended
tweetRouter.patch("/tweets/:id", authMiddle, async function(req, res) {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["content", "pictures", "videos"];
  const isValidOperation = updates.every(function(update) {
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
    updates.forEach(function(update) {
      tweet[update] = req.body[update];
    });
    await tweet.save();
    res.status(200).send(tweet);
  } catch (e) {
    console.error(e);
    res.status(500).send({ error: "Internal server error" });
  }
});

/**
 * Update comments after authorization
 */

// Status: Working as intended
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

// HTTP Method: DELETE

/**
 * Delete a tweet from the database
 */

// Status: Working as intended
tweetRouter.delete("/tweets/:id", authMiddle, async function(req, res) {
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

/**
 * Delete a comment
 */

// Status: Working as intended
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

export default tweetRouter;
