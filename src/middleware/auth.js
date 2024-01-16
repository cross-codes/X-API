import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const authMiddle = async function(req, res, next) {
  try {
    // Remove the `Bearer` from the Authorization header
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
    });

    if (!user) {
      throw new Error("User not found");
    }
    // Add the used token and a user field to the request, to be used by the server
    req.token = token;
    req.user = user;
    next();
  } catch (e) {
    res.status(401).send({ error: "Authorization Failed" });
  }
};

export default authMiddle;
