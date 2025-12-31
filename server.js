const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

// These will be set as Railway environment variables
const AIRTABLE_API_URL = process.env.AIRTABLE_API_URL; // e.g. https://api.airtable.com/v0/appXXXX/Orders
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

app.post("/api/order", async (req, res) => {
  // Debug: log token length and preview
  console.log(
    "Token length:",
    AIRTABLE_TOKEN ? AIRTABLE_TOKEN.length : 0,
    "Token preview:",
    AIRTABLE_TOKEN
      ? AIRTABLE_TOKEN.slice(0, 6) + "..." + AIRTABLE_TOKEN.slice(-4)
      : "undefined"
  );
  try {
    const orderData = req.body;
    const response = await fetch(AIRTABLE_API_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + AIRTABLE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: orderData }),
    });
    const data = await response.json();
    console.log("Airtable response:", data);
    res.status(200).json(data);
  } catch (err) {
    console.error("Order error:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
