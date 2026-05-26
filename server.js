// New Server update

const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());
app.use(express.json());

// // app.use(cors());
// app.use(cors({
//   origin: "*",
//   methods: ["GET", "POST", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"]
// }));
// app.options("*", cors());

// app.use(express.json());

// These will be set as Render environment variables
const AIRTABLE_API_URL = process.env.AIRTABLE_API_URL;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_PRODUCTS_URL = process.env.AIRTABLE_PRODUCTS_URL;
const AIRTABLE_MERCHANTS_URL = process.env.AIRTABLE_MERCHANTS_URL;

// Health check route for UptimeRobot
app.get("/", (req, res) => {
  res.status(200).send("EgoTech server is running!");
});


// ── GET /api/products ──────────────────────────────
// Fetch approved products from Airtable for the site
app.get("/api/products", async (req, res) => {
  try {
    const url = `${process.env.AIRTABLE_PRODUCTS_URL}?filterByFormula={status}='approved'`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: "Bearer " + AIRTABLE_TOKEN,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    // Map Airtable records to product format
    const products = data.records.map((record) => ({
      id: record.id,
      name: record.fields.name || "",
      category: record.fields.category || "",
      brand: record.fields.brand || "",
      price: record.fields.price || 0,
      currency: record.fields.currency || "NGN",
      description: record.fields.description || "",
      shortDescription: record.fields.shortDescription || "",
      image: record.fields.image || "",
      images: record.fields.images
        ? record.fields.images.split(",").map((i) => i.trim())
        : [],
      rating: record.fields.rating || 0,
      stock: record.fields.stock || 0,
      featured: record.fields.featured || false,
      newArrival: record.fields.newArrival || false,
    }));

    res.status(200).json({ products });
  } catch (err) {
    console.error("Products fetch error:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});


// ── POST /api/products ─────────────────────────────
// Receive merchant product submission
app.post("/api/products", async (req, res) => {
  const productData = req.body;

  // ── INPUT VALIDATION ──────────────────────────────
  const requiredFields = ["name", "category", "brand", "price", "description", "image"];
  const missingFields = requiredFields.filter(
    (field) => !productData[field] || productData[field] === ""
  );

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: "Missing required fields",
      fields: missingFields,
    });
  }

  if (isNaN(productData.price) || productData.price <= 0) {
    return res.status(400).json({ error: "Invalid price" });
  }
  // ── END VALIDATION ────────────────────────────────

  try {
    // ── Save product to Products table ──
    const productResponse = await fetch(AIRTABLE_PRODUCTS_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + AIRTABLE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          name: productData.name,
          category: productData.category,
          brand: productData.brand,
          price: Number(productData.price),
          description: productData.description,
          shortDescription: productData.shortDescription || "",
          image: productData.image,
          images: productData.images || "",
          stock: Number(productData.stock) || 0,
          featured: false,
          newArrival: false,
          status: "pending",
        },
      }),
    });

   const productSaved = await productResponse.json();

if (!productResponse.ok) {
  console.error("Airtable Products error:", JSON.stringify(productSaved));
  throw new Error("Failed to save product to Airtable");
}

    // ── Save merchant to Merchants table ──
    const merchantResponse = await fetch(AIRTABLE_MERCHANTS_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + AIRTABLE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          merchantName: productData.merchantName || "",
          merchantEmail: productData.merchantEmail || "",
          merchantPhone: productData.merchantPhone || "",
          merchantBusiness: productData.merchantBusiness || "",
          merchantAddress: productData.merchantAddress || "",
          productName: productData.name || "",
          status: "pending",
        },
      }),
    });

   const merchantSaved = await merchantResponse.json();

if (!merchantResponse.ok) {
  console.error("Airtable Merchants error:", JSON.stringify(merchantSaved));
  throw new Error("Failed to save merchant to Airtable");
}

    res.status(200).json({ 
      success: true, 
      productId: productSaved.id,
      merchantId: merchantSaved.id 
    });

  } catch (err) {
    console.error("Product submission error:", err);
    res.status(500).json({ error: "Failed to submit product" });
  }
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
      body: JSON.stringify({ fields: {
        ...orderData,
        status: "pending",
      }}),
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


