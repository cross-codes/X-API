import express from "express";

import "./db/connection.js";

const app = express();

app.use(express.json());

export default app;
