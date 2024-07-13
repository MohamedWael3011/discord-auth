const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const User = require("./models/user"); // Adjust path as necessary

const app = express();
const port = 8000; // MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Middleware
app.use(cors());
app.use(express.json());

// Discord OAuth configuration
const client_id = process.env.DISCORD_CLIENT_ID;
const client_secret = process.env.DISCORD_CLIENT_SECRET;
const redirect_uri = process.env.DISCORD_REDIRECT_URI;

// Discord authentication route
app.get("/auth/discord", (req, res) => {
  const authorizeUrl = `https://discord.com/oauth2/authorize?client_id=${client_id}&response_type=code&redirect_uri=${encodeURIComponent(
    redirect_uri
  )}&scope=identify`;
  res.redirect(authorizeUrl);
});

// Discord callback route
app.get("/auth/discord/callback", async (req, res) => {
  const { code } = req.query;
  const params = new URLSearchParams({
    client_id,
    client_secret,
    grant_type: "authorization_code",
    code,
    redirect_uri,
  });
  try {
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenResponse.data.access_token}`,
      },
    });

    // Example response, assuming userResponse contains Discord ID
    const discordID = userResponse.data.id;

    res.json(userResponse.data);
  } catch (error) {
    console.error("Error during Discord authentication:", error);
    res.status(500).send("Error during Discord authentication");
  }
});

// Route to update user's Matic address
app.post("/update-matic-address", async (req, res) => {
  const { discordID, maticAddress, signature, message } = req.body;

  try {
    // Verify the signature
    const signerAddress = ethers.utils.verifyMessage(message, signature);

    if (signerAddress.toLowerCase() !== maticAddress.toLowerCase()) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    // Check if the user exists
    let user = await User.findOne({ discordID });

    if (!user) {
      // If user doesn't exist, create a new entry
      user = new User({ discordID, maticAddress });
    } else {
      // If user exists, update their Matic address
      user.maticAddress = maticAddress;
    }

    // Save the updated user information
    await user.save();

    res.status(200).json({ message: "User data updated successfully" });
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).send("Error updating user data");
  }
});

// Start HTTP server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
