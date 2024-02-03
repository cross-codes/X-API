import express from "express";

import "./db/connection.js";
import tweetRouter from "./routers/tweet.router.js";
import userRouter from "./routers/user.router.js";

const app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:8080");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus("200");
  }

  next();
});

app.use(express.json());
app.use(userRouter);
app.use(tweetRouter);

export default app;
