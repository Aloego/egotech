// New Server update

const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

// These will be set as Render environment variables
const AIRTABLE_API_URL = process.env.AIRTABLE_API_URL;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

// Health check route for UptimeRobot
app.get("/", (req, res) => {
  res.status(200).send("EgoTech server is running!");
});

app.post("/api/order", async (req, res) => {
  const orderData = req.body;

  // ── INPUT VALIDATION ──────────────────────────────────────
  // Check that required fields are present and not empty
  const requiredFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "address",
    "country",
    "state",
    "cartItems",
    "orderDate",
  ];

  const missingFields = requiredFields.filter(
    (field) => !orderData[field] || orderData[field] === ""
  );

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: "Missing required fields",
      fields: missingFields,
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(orderData.email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  // Validate phone — must be at least 7 digits
  const phoneDigits = orderData.phone.replace(/\D/g, "");
  if (phoneDigits.length < 7) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  // Validate cartItems is not empty
  const cart = Array.isArray(orderData.cartItems)
    ? orderData.cartItems
    : JSON.parse(orderData.cartItems || "[]");

  if (cart.length === 0) {
    return res.status(400).json({ error: "Cart is empty" });
  }
  // ── END VALIDATION ────────────────────────────────────────

  try {
    // Stringify cartItems before sending to Airtable
    if (orderData.cartItems) {
      orderData.cartItems = JSON.stringify(orderData.cartItems);
    }

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


// Old Server Codes
// const express = require("express");
// const fetch = require("node-fetch");
// const cors = require("cors");
// const app = express();
// app.use(cors());
// app.use(express.json());

// // These will be set as Railway environment variables
// const AIRTABLE_API_URL = process.env.AIRTABLE_API_URL; // e.g. https://api.airtable.com/v0/appXXXX/Orders
// const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;

// // Health check route for UptimeRobot
// app.get("/", (req, res) => {
//   res.status(200).send("EgoTech server is running!");
// });

// // Order route
// app.post("/api/order", async (req, res) => {
//   // Debug: log token length and preview
//   console.log(
//     "Token length:",
//     AIRTABLE_TOKEN ? AIRTABLE_TOKEN.length : 0,
//     "Token preview:",
//     AIRTABLE_TOKEN
//       ? AIRTABLE_TOKEN.slice(0, 6) + "..." + AIRTABLE_TOKEN.slice(-4)
//       : "undefined"
//   );
//   try {
//     const orderData = req.body;
//     // Stringify cartItems if present
//     if (orderData.cartItems) {
//       orderData.cartItems = JSON.stringify(orderData.cartItems);
//     }
//     const response = await fetch(AIRTABLE_API_URL, {
//       method: "POST",
//       headers: {
//         Authorization: "Bearer " + AIRTABLE_TOKEN,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ fields: orderData }),
//     });
//     const data = await response.json();
//     console.log("Airtable response:", data);
//     res.status(200).json(data);
//   } catch (err) {
//     console.error("Order error:", err);
//     res.status(500).json({ error: "Failed to save order" });
//   }
// });

// const PORT = process.env.PORT || 8080;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
