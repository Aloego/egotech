// New Server update

const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());
app.use(express.json());


// These will be set as Render environment variables
const AIRTABLE_API_URL = process.env.AIRTABLE_API_URL;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_PRODUCTS_URL = process.env.AIRTABLE_PRODUCTS_URL;
const AIRTABLE_MERCHANTS_URL = process.env.AIRTABLE_MERCHANTS_URL;
const AIRTABLE_ORDER_ITEMS_URL = process.env.AIRTABLE_ORDER_ITEMS_URL;
const AIRTABLE_INQUIRIES_URL = process.env.AIRTABLE_INQUIRIES_URL;

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
      condition: record.fields.condition || "",
      merchantName: record.fields.merchantName || "",
      merchantPhone: record.fields.merchantPhone || "",
      merchantBusiness: record.fields.merchantBusiness || "",
      merchantAddress: record.fields.merchantAddress || "",
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
          condition: productData.condition || "",
          merchantName: productData.merchantName || "",
          merchantPhone: productData.merchantPhone || "",
          merchantBusiness: productData.merchantBusiness || "",
          merchantAddress: productData.merchantAddress || "",
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
    // Keep cart as array for OrderItems processing
    const cartArray = Array.isArray(orderData.cartItems)
      ? orderData.cartItems
      : JSON.parse(orderData.cartItems || "[]");

    // Stringify cartItems before sending to Orders table
    const orderToSave = {
      ...orderData,
      cartItems: JSON.stringify(cartArray),
      status: "pending",
    };

    // ── Save order to Orders table ──
    const orderResponse = await fetch(AIRTABLE_API_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + AIRTABLE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: orderToSave }),
    });

    const orderSaved = await orderResponse.json();
    console.log("Airtable order response:", orderSaved);

    if (!orderResponse.ok) {
      console.error("Airtable Order error:", JSON.stringify(orderSaved));
      throw new Error("Failed to save order");
    }

    // ── Save each cart item to OrderItems table ──
    const orderId = orderSaved.id;

    const orderItemPromises = cartArray.map((item) =>
      fetch(AIRTABLE_ORDER_ITEMS_URL, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + AIRTABLE_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            orderId: orderId,
            productName: item.name || "",
            productId: String(item.id) || "",
            quantity: Number(item.qty) || 1,
            price: Number(item.price) || 0,
            merchantName: item.merchantName || "",
            merchantPhone: item.merchantPhone || "",
            merchantBusiness: item.merchantBusiness || "",
            merchantAddress: item.merchantAddress || "",
          },
        }),
      })
    );

    const orderItemResults = await Promise.all(orderItemPromises);
    
    // Check each result for errors
    for (let i = 0; i < orderItemResults.length; i++) {
      const result = orderItemResults[i];
      const resultData = await result.json();
      if (!result.ok) {
        console.error(`OrderItem ${i + 1} failed:`, JSON.stringify(resultData));
      } else {
        console.log(`OrderItem ${i + 1} saved successfully:`, resultData.id);
      }
    }
    
    console.log(`Processed ${cartArray.length} order items`);
    
    res.status(200).json(orderSaved);
  } catch (err) {
    console.error("Order error:", err);
    res.status(500).json({ error: "Failed to save order" });
  }
});

// ═══════════════════════════════════════════════════════════
// ADMIN: order status manager (used by admin.html)
// Everything below is locked behind a password that you set in the
// ADMIN_PASSWORD environment variable on Render. Without it, the
// admin routes stay switched off.
// ═══════════════════════════════════════════════════════════
app.set("trust proxy", 1); // so we see the visitor's real IP behind Render

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ORDER_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

// Stop password guessing: after 10 wrong tries, an IP is blocked for 15 minutes
const MAX_FAILED_LOGINS = 10;
const LOCKOUT_MS = 15 * 60 * 1000;
const failedLogins = new Map(); // ip -> { count, first }

// Tidy the list now and then so it never grows forever
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of failedLogins) {
    if (now - rec.first > LOCKOUT_MS) failedLogins.delete(ip);
  }
}, LOCKOUT_MS).unref();

function adminAuth(req, res, next) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ error: "The admin password isn't set on the server yet. Add ADMIN_PASSWORD on Render, then try again." });
  }

  const ip = req.ip;
  const now = Date.now();
  let rec = failedLogins.get(ip);
  if (rec && now - rec.first > LOCKOUT_MS) {
    failedLogins.delete(ip);
    rec = undefined;
  }
  if (rec && rec.count >= MAX_FAILED_LOGINS) {
    return res.status(429).json({ error: "Too many wrong attempts. Try again in 15 minutes." });
  }

  const header = req.headers.authorization || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Compare hashes so the check takes the same time whatever is typed
  const a = crypto.createHash("sha256").update(supplied).digest();
  const b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();

  if (!crypto.timingSafeEqual(a, b)) {
    const updated = rec || { count: 0, first: now };
    updated.count += 1;
    failedLogins.set(ip, updated);
    return res.status(401).json({ error: "Wrong password" });
  }

  failedLogins.delete(ip);
  next();
}

function inquiriesBaseUrl() {
  return (AIRTABLE_INQUIRIES_URL || "").replace(/\/+$/, "");
}

// ── GET /api/admin/orders ──────────────────────────
// All Buy Now inquiries, newest first (up to 1000)
app.get("/api/admin/orders", adminAuth, async (req, res) => {
  if (!inquiriesBaseUrl()) {
    return res.status(503).json({
      error: "The Inquiries table isn't set up on the server yet. Add AIRTABLE_INQUIRIES_URL on Render, then try again.",
    });
  }

  try {
    let records = [];
    let offset;

    do {
      const params = new URLSearchParams({ pageSize: "100" });
      if (offset) params.append("offset", offset);

      const response = await fetch(`${inquiriesBaseUrl()}?${params}`, {
        headers: { Authorization: "Bearer " + AIRTABLE_TOKEN },
      });
      const data = await response.json();

      if (!response.ok) {
        console.error("Admin load inquiries error:", JSON.stringify(data));
        return res.status(502).json({ error: "Could not load inquiries from Airtable" });
      }

      records = records.concat(data.records || []);
      offset = data.offset;
    } while (offset && records.length < 1000);

    // Newest first, using the time Airtable created each row
    records.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));

    res.json({
      statuses: ORDER_STATUSES,
      orders: records.map((rec) => ({
        id: rec.id,
        createdTime: rec.createdTime,
        fields: rec.fields,
      })),
    });
  } catch (err) {
    console.error("Admin inquiries error:", err);
    res.status(500).json({ error: "Failed to load inquiries" });
  }
});

// ── PATCH /api/admin/orders/:id/status ─────────────
// Change one inquiry's status
app.patch("/api/admin/orders/:id/status", adminAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!inquiriesBaseUrl()) {
    return res.status(503).json({
      error: "The Inquiries table isn't set up on the server yet. Add AIRTABLE_INQUIRIES_URL on Render, then try again.",
    });
  }
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) {
    return res.status(400).json({ error: "Invalid order id" });
  }
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const response = await fetch(`${inquiriesBaseUrl()}/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + AIRTABLE_TOKEN,
        "Content-Type": "application/json",
      },
      // typecast lets Airtable accept a status it hasn't seen before
      body: JSON.stringify({ fields: { status }, typecast: true }),
    });
    const data = await response.json();

    if (!response.ok) {
      console.error("Admin status update error:", JSON.stringify(data));
      return res.status(502).json({ error: "Airtable would not update this inquiry" });
    }

    res.json({ id: data.id, status: data.fields.status });
  } catch (err) {
    console.error("Admin status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ── POST /api/inquiry ──────────────────────────────
// Saves a Buy Now inquiry (the product and the buyer's phone number)
// to the Inquiries table. This one is public, because every shopper's
// Buy Now click calls it, so it checks its input and limits how often
// one visitor can send inquiries.
const INQUIRY_LIMIT = 20; // inquiries allowed per visitor...
const INQUIRY_WINDOW_MS = 60 * 60 * 1000; // ...per hour
const inquiryHits = new Map(); // ip -> { count, first }

setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of inquiryHits) {
    if (now - rec.first > INQUIRY_WINDOW_MS) inquiryHits.delete(ip);
  }
}, INQUIRY_WINDOW_MS).unref();

app.post("/api/inquiry", async (req, res) => {
  if (!inquiriesBaseUrl()) {
    console.error("Inquiry received but AIRTABLE_INQUIRIES_URL is not set");
    return res.status(503).json({ error: "Inquiries are not set up on the server yet" });
  }

  // Limit how many inquiries one visitor can send
  const now = Date.now();
  let hit = inquiryHits.get(req.ip);
  if (!hit || now - hit.first > INQUIRY_WINDOW_MS) {
    hit = { count: 0, first: now };
    inquiryHits.set(req.ip, hit);
  }
  hit.count += 1;
  if (hit.count > INQUIRY_LIMIT) {
    return res.status(429).json({ error: "Too many inquiries. Please try again later." });
  }

  // Check and tidy what was sent
  const body = req.body || {};
  const productName = String(body.productName || "").trim().slice(0, 200);
  const productId = String(body.productId == null ? "" : body.productId).trim().slice(0, 100);
  const buyerPhone = String(body.buyerPhone || "").replace(/\D/g, "");
  const price = Number(body.price);
  const quantity = Math.min(Math.max(parseInt(body.quantity, 10) || 1, 1), 100);

  if (!productName) {
    return res.status(400).json({ error: "Missing product name" });
  }
  if (buyerPhone.length < 11 || buyerPhone.length > 15) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  try {
    const response = await fetch(inquiriesBaseUrl(), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + AIRTABLE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          productId,
          productName,
          price: Number.isFinite(price) && price >= 0 ? price : 0,
          quantity,
          buyerPhone,
          status: "pending",
        },
        typecast: true,
      }),
    });
    const saved = await response.json();

    if (!response.ok) {
      console.error("Inquiry save error:", JSON.stringify(saved));
      return res.status(502).json({ error: "Failed to log inquiry" });
    }

    res.status(200).json({ success: true, id: saved.id });
  } catch (err) {
    console.error("Inquiry error:", err);
    res.status(500).json({ error: "Failed to log inquiry" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
