import cors from "cors";
import express from "express";

import "./db/connection.js";
import tweetRouter from "./routers/tweet.router.js";
import userRouter from "./routers/user.router.js";

const corsOpts = {
  origin: "http://localhost:8080",
};

const app = express();

app.options("*", cors(corsOpts));
app.use(cors(corsOpts));

app.use(express.json());
app.use(userRouter);
app.use(tweetRouter);

export default app;
