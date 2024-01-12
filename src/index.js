import app from "./app.js";

const port = process.env.PORT || 3000;

app.listen(port, (err) => {
  if (err) console.error(err);
  console.log(`Server is up on port: ${port}`);
});
