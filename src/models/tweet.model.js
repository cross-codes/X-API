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
