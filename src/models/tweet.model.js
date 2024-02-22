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

const Tweet = mongoose.model("Tweet", tweetSchema);
export default Tweet;
