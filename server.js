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
    return res.status(503).json({ error: "Admin is not set up on the server yet" });
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

function ordersBaseUrl() {
  return (AIRTABLE_API_URL || "").replace(/\/+$/, "");
}

// ── GET /api/admin/orders ──────────────────────────
// All orders and WhatsApp inquiries, newest first (up to 1000)
app.get("/api/admin/orders", adminAuth, async (req, res) => {
  try {
    let records = [];
    let offset;

    do {
      const params = new URLSearchParams({ pageSize: "100" });
      params.append("sort[0][field]", "orderDate");
      params.append("sort[0][direction]", "desc");
      if (offset) params.append("offset", offset);

      const response = await fetch(`${ordersBaseUrl()}?${params}`, {
        headers: { Authorization: "Bearer " + AIRTABLE_TOKEN },
      });
      const data = await response.json();

      if (!response.ok) {
        console.error("Admin load orders error:", JSON.stringify(data));
        return res.status(502).json({ error: "Could not load orders from Airtable" });
      }

      records = records.concat(data.records || []);
      offset = data.offset;
    } while (offset && records.length < 1000);

    res.json({
      statuses: ORDER_STATUSES,
      orders: records.map((rec) => ({
        id: rec.id,
        createdTime: rec.createdTime,
        fields: rec.fields,
      })),
    });
  } catch (err) {
    console.error("Admin orders error:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// ── PATCH /api/admin/orders/:id/status ─────────────
// Change one order's status
app.patch("/api/admin/orders/:id/status", adminAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) {
    return res.status(400).json({ error: "Invalid order id" });
  }
  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const response = await fetch(`${ordersBaseUrl()}/${id}`, {
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
      return res.status(502).json({ error: "Airtable would not update this order" });
    }

    res.json({ id: data.id, status: data.fields.status });
  } catch (err) {
    console.error("Admin status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// ── POST /api/inquiry ──────────────────────────────
// Log a Buy Now / WhatsApp inquiry to Orders + OrderItems
app.post("/api/inquiry", async (req, res) => {
  const { productId, productName, price, quantity, merchantName, merchantPhone, merchantBusiness, merchantAddress } = req.body;

  try {
    // ── Save to Orders table ──
    const orderResponse = await fetch(AIRTABLE_API_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + AIRTABLE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          firstName: "WhatsApp",
          lastName: "Inquiry",
          email: "n/a",
          phone: merchantPhone || "n/a",
          address: "n/a",
          country: "Nigeria",
          state: "n/a",
          cartItems: JSON.stringify([{ id: productId, name: productName, price, qty: quantity || 1 }]),
          orderDate: new Date().toISOString(),
          status: "pending",
        },
      }),
    });

    const orderSaved = await orderResponse.json();
    if (!orderResponse.ok) {
      console.error("Inquiry order error:", JSON.stringify(orderSaved));
      return res.status(500).json({ error: "Failed to log inquiry" });
    }

    // ── Save to OrderItems table ──
    await fetch(AIRTABLE_ORDER_ITEMS_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + AIRTABLE_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          orderId: orderSaved.id,
          productName: productName || "",
          productId: String(productId) || "",
          quantity: Number(quantity) || 1,
          price: Number(price) || 0,
          merchantName: merchantName || "",
          merchantPhone: merchantPhone || "",
          merchantBusiness: merchantBusiness || "",
          merchantAddress: merchantAddress || "",
        },
      }),
    });

    res.status(200).json({ success: true, orderId: orderSaved.id });
  } catch (err) {
    console.error("Inquiry error:", err);
    res.status(500).json({ error: "Failed to log inquiry" });
  }
});