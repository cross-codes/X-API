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
