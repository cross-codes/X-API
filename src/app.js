import express from "express";

import "./db/connection.js";
import tweetRouter from "./routers/tweet.router.js";
import userRouter from "./routers/user.router.js";

const app = express();

app.use(express.json());
app.use(userRouter);
app.use(tweetRouter);

export default app;
