# EgoTech E-commerce Migration Specification

**Version:** 2.0  
**Branch:** `techpoint-v2`  
**Target:** Supabase PostgreSQL (database only)  
**Source:** Airtable + local JSON files  
**Architecture:** Static HTML/CSS/JS frontend → Node.js/Express backend → Supabase PostgreSQL  
**Status:** Draft — for review and approval

---

## 1. Overview

This document defines the migration of the EgoTech e-commerce platform's **database layer** from Airtable + JSON files to Supabase PostgreSQL. The application architecture remains:

- **Frontend:** Static HTML/CSS/JavaScript (no framework, no build step)
- **Backend:** Node.js/Express on Render (retains all API routes)
- **Database:** Supabase PostgreSQL (replaces Airtable)
- **Supporting services:** Supabase Auth and Storage may be evaluated later — **not approved for implementation yet**

### 1.1 Current State (Verified)

| Component | Technology | Notes |
|-----------|------------|-------|
| Frontend | Static HTML + Bootstrap 5 + jQuery + Owl Carousel | 7 pages: index, shop, product-details, merchant, contact, terms, product (categories) |
| Backend | Node.js/Express on Render | 4 API routes: `GET /api/products`, `POST /api/products`, `POST /api/order`, `POST /api/inquiry` |
| Primary DB | Airtable | 4 tables: Products, Merchants, Orders, OrderItems |
| Fallback data | Local JSON files | `data/product.json` (20 products), `data/promos.json`, `data/shipping-zones.json`, `data/tax-rates.json`, `data/lga-towns.json`, `data/cart.json` |
| Auth | None | Terms state: "does not require visitors or customers to create an account" |
| Payments | None | Off-platform via WhatsApp; no payment gateway |
| Images | Cloudinary (unsigned preset `rezukj30` in client JS) | Merchant form uploads only |
| CORS | `origin: "*"` | Open — security concern |

### 1.2 Target State (Proposed)

- Supabase PostgreSQL as primary database
- Express backend continues to serve all API routes, now querying Supabase via service-role key
- Static frontend unchanged — continues calling Express endpoints
- Row-level security (RLS) on all tables — **designs require validation before implementation**
- Proper CORS configuration on Express
- Supabase Auth and Storage: **deferred** — explicit approval required

---

## 2. Database Schema (Proposed Design — Requires Validation)

All tables use UUID primary keys (`gen_random_uuid()`), `created_at`/`updated_at` timestamps, and RLS enabled. **Every RLS policy below is a design proposal requiring validation before implementation.**

### 2.1 `merchants` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Merchant unique identifier |
| `user_id` | UUID | REFERENCES `auth.users(id)`, UNIQUE, NULLABLE | Link to Supabase Auth identity — **NULL for migrated merchants without accounts** |
| `merchant_name` | TEXT | NOT NULL | Full name of vendor |
| `merchant_email` | TEXT | NOT NULL, UNIQUE | Email address |
| `merchant_phone` | TEXT | NOT NULL | Phone number (E.164 format) |
| `merchant_business` | TEXT | NOT NULL | Business/store name |
| `merchant_address` | TEXT | NOT NULL | Business address |
| `status` | TEXT | DEFAULT `'pending'`, CHECK (`status` IN (`'pending'`, `'approved'`, `'rejected'`)) | Account approval status |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | Last status update |

**RLS Policy Proposals (require validation):**
- Public read: `SELECT` for `anon`, `authenticated` — `USING (true)`
- Vendor update own: `UPDATE` for `authenticated` — `USING (user_id = auth.uid())`
- Service role (backend): full access via service-role key (bypasses RLS)

**Critical:** Do not assume existing Airtable merchants have `auth.users` accounts. `user_id` remains `NULL` until a merchant signs up and is linked.

---

### 2.2 `products` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Product unique identifier |
| `merchant_id` | UUID | REFERENCES `merchants(id)`, NULLABLE | **FK to merchant — NULL for historical/unassigned products** |
| `name` | TEXT | NOT NULL | Product name |
| `brand` | TEXT | — | Brand name |
| `category` | TEXT | — | Product category |
| `price` | DECIMAL(10,2) | NOT NULL, CHECK (`price` > 0) | Price in NGN |
| `currency` | TEXT | DEFAULT `'NGN'` | Currency code |
| `description` | TEXT | — | Full product description (HTML stored as text) |
| `short_description` | TEXT | — | Short summary (max 120 chars) |
| `image` | TEXT | — | Main image URL (Cloudinary or future Storage) |
| `images` | TEXT[] | DEFAULT `'{}'` | Array of image URLs |
| `rating` | DECIMAL(3,1) | DEFAULT 0, CHECK (`rating` >= 0 AND `rating` <= 5) | Average star rating |
| `stock` | INTEGER | DEFAULT 0, CHECK (`stock` >= 0) | Inventory count |
| `featured` | BOOLEAN | DEFAULT FALSE | Featured product flag |
| `new_arrival` | BOOLEAN | DEFAULT FALSE | New arrival flag |
| `condition` | TEXT | DEFAULT `''`, CHECK (`condition` IN (`'NEW'`, `'USED'`, `'REFURBISHED'`, `''`)) | Product condition |
| `features` | TEXT[] | DEFAULT `'{}'` | Array of feature strings |
| `specifications` | JSONB | — | Key-value spec pairs |
| `reviews` | JSONB | — | Array of {name, rating, date, comment} |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | Last update timestamp |

**Removed from v1 schema:** `merchant_name`, `merchant_phone`, `merchant_business`, `merchant_address` (denormalized duplicates). These are replaced by `merchant_id` FK. Historical products without a merchant keep `merchant_id = NULL`.

**RLS Policy Proposals (require validation):**
- Public read: `SELECT` for `anon`, `authenticated` — `USING (true)`
- Vendor insert: `INSERT` for `authenticated` — `WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))`
- Vendor update own: `UPDATE` for `authenticated` — `USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))`
- Vendor delete own: `DELETE` for `authenticated` — `USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))`
- Service role (backend): full access via service-role key

---

### 2.3 `orders` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Order unique identifier |
| `first_name` | TEXT | NOT NULL | Customer first name |
| `last_name` | TEXT | NOT NULL | Customer last name |
| `email` | TEXT | NOT NULL | Customer email |
| `phone` | TEXT | NOT NULL | Customer phone (E.164) |
| `address` | TEXT | NOT NULL | Delivery address |
| `country` | TEXT | NOT NULL | Country |
| `state` | TEXT | NOT NULL | State/region |
| `cart_items` | JSONB | NOT NULL | Array of {product_id, product_name, quantity, price} — **prices validated server-side** |
| `order_date` | TIMESTAMPTZ | NOT NULL | Order placement timestamp |
| `status` | TEXT | DEFAULT `'pending'`, CHECK (`status` IN (`'pending'`, `'confirmed'`, `'shipped'`, `'delivered'`, `'cancelled'`)) | Order lifecycle status |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Creation timestamp |

**RLS Policy Proposals (require validation):**
- Customer read own: `SELECT` for `authenticated` — `USING (email = auth.jwt() ->> 'email')` — **only works if customers have accounts (not currently implemented)**
- Guest insert: `INSERT` for `anon`, `authenticated` — `WITH CHECK (true)` — checkout remains guest-friendly
- Service role (backend): full access

---

### 2.4 `order_items` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Order item unique identifier |
| `order_id` | UUID | NOT NULL, REFERENCES `orders(id)` ON DELETE CASCADE | Parent order |
| `product_id` | UUID | REFERENCES `products(id)`, NULLABLE | Product FK (NULL if product deleted) |
| `product_name` | TEXT | NOT NULL | Product name at time of purchase (snapshot) |
| `quantity` | INTEGER | NOT NULL, CHECK (`quantity` > 0) | Number of units |
| `price` | DECIMAL(10,2) | NOT NULL, CHECK (`price` > 0) | Unit price at purchase (snapshot) |
| `merchant_id` | UUID | REFERENCES `merchants(id)`, NULLABLE | Merchant FK at time of purchase |
| `merchant_name` | TEXT | NOT NULL | Vendor name (snapshot) |
| `merchant_phone` | TEXT | — | Vendor phone (snapshot) |
| `merchant_business` | TEXT | — | Vendor business name (snapshot) |
| `merchant_address` | TEXT | — | Vendor address (snapshot) |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Creation timestamp |

**Merchant snapshots preserved** on order_items for historical accuracy even if merchant record changes.

**RLS Policy Proposals (require validation):**
- Customer read own: `SELECT` for `authenticated` — `USING (order_id IN (SELECT id FROM orders WHERE email = auth.jwt() ->> 'email'))`
- Service role (backend): full access

---

### 2.5 `inquiries` Table (New — Separates WhatsApp Inquiries from Orders)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Inquiry unique identifier |
| `product_id` | UUID | REFERENCES `products(id)`, NULLABLE | Product inquired about |
| `product_name` | TEXT | NOT NULL | Product name at time of inquiry (snapshot) |
| `merchant_id` | UUID | REFERENCES `merchants(id)`, NULLABLE | Merchant FK |
| `merchant_phone` | TEXT | NOT NULL | Merchant phone (for WhatsApp link) |
| `customer_name` | TEXT | — | Customer name (only if provided) |
| `customer_phone` | TEXT | — | Customer phone (only if provided) |
| `customer_email` | TEXT | — | Customer email (only if provided) |
| `status` | TEXT | DEFAULT `'new'`, CHECK (`status` IN (`'new'`, `'contacted'`, `'converted'`, `'closed'`)) | Inquiry lifecycle |
| `notes` | TEXT | — | Internal notes |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Inquiry timestamp |

**Key design rules:**
- An inquiry **does not create an order** — no fake order records
- Merchant phone stored for WhatsApp link; **customer phone/email only stored if actually provided**
- Preserves current WhatsApp customer journey: frontend opens `wa.me` link, backend logs inquiry
- No payment, no order status, no cart items

**RLS Policy Proposals (require validation):**
- Public insert: `INSERT` for `anon`, `authenticated` — `WITH CHECK (true)` (frontend posts to `/api/inquiry`)
- Merchant read own: `SELECT` for `authenticated` — `USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))`
- Service role (backend): full access

---

### 2.6 `profiles` Table (Supabase Auth Link — Deferred)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, REFERENCES `auth.users(id)` ON DELETE CASCADE | Linked to Supabase Auth |
| `full_name` | TEXT | — | User's full name |
| `role` | TEXT | DEFAULT `'customer'`, CHECK (`role` IN (`'customer'`, `'vendor'`)) | User role |
| `phone` | TEXT | — | User's phone number |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Profile creation timestamp |

**Status:** Supabase Auth not approved. This table is defined for future use only. Do not create until approved.

---

### 2.7 `product_migrations` Table (Mapping Table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Mapping record ID |
| `source_system` | TEXT | NOT NULL, CHECK (`source_system` IN (`'airtable'`, `'json'`)) | Source system |
| `source_id` | TEXT | NOT NULL | Original ID from source (Airtable record ID or JSON integer) |
| `product_id` | UUID | NOT NULL, REFERENCES `products(id)` ON DELETE CASCADE | Destination product UUID |
| `migrated_at` | TIMESTAMPTZ | DEFAULT `now()` | Migration timestamp |
| UNIQUE (`source_system`, `source_id`) | | | Prevents duplicate migrations |

**Purpose:** Reliable mapping between source IDs and generated UUIDs. **Never pass integer JSON IDs into UUID columns.**

---

### 2.8 Supporting Tables (Assessed Individually)

| JSON File | Proposed Table | Status |
|-----------|----------------|--------|
| `promos.json` | `promos` | **Proposed** — single-row promo banner, used by homepage |
| `shipping-zones.json` | `shipping_zones` | **Proposed** — used by checkout (not yet implemented) |
| `tax-rates.json` | `tax_rates` | **Proposed** — used by checkout (not yet implemented) |
| `lga-towns.json` | `lga_towns` | **Proposed** — address autocomplete reference data |
| `cart.json` | — | **Not migrated** — verify usage first; appears unused (no cart.html/checkout.html) |

**Decision required:** Confirm which JSON files are actively used by the frontend before creating tables.

---

## 3. Data Migration Plan (Proposed — Requires Airtable Export & Inspection First)

### 3.1 Prerequisites (Must Complete Before Migration)

1. **Export all Airtable tables** (Products, Merchants, Orders, OrderItems) to CSV/JSON
2. **Inspect actual field formats** for:
   - `images` (comma-separated? array? Cloudinary URLs?)
   - `specifications` (object? stringified JSON? nested structure?)
   - `reviews` (array of objects? stringified?)
   - Merchant fields on products (present on all? only some? format?)
3. **Record source row counts** for each table
4. **Identify duplicates, missing required fields, referential integrity issues**

**Do not finalize migration mappings until Airtable export is inspected.**

### 3.2 Product Migration (`data/product.json` + Airtable Products)

**Current state (verified):**
- `data/product.json`: 20 products, inconsistent schema
  - Products 1-10: Basic fields only (no merchant info)
  - Products 11-20: Include `merchantName`, `merchantPhone`, `merchantBusiness`, `merchantAddress`
- Airtable Products table: Unknown schema — **requires export**

**Migration approach:**
1. Create `product_migrations` entries for each source record
2. Generate UUID for each product in Supabase
3. For products with merchant info: look up or create merchant by email (exact match only — **no name/phone fuzzy matching**)
4. Set `merchant_id` FK on product; **do not copy denormalized merchant fields**
5. For products without merchant info: `merchant_id = NULL`
6. Convert `images` → `TEXT[]` (split on comma, trim)
6. Convert `specifications` → `JSONB` (parse if stringified)
7. Convert `reviews` → `JSONB` (parse if stringified)
8. Record source/destination row counts; validate no data loss

**Mapping strategy:**
- JSON products: `source_system = 'json'`, `source_id = String(json_id)`
- Airtable products: `source_system = 'airtable'`, `source_id = airtable_record_id`

### 3.3 Merchant Migration (Airtable Merchants)

**Current state:** Airtable Merchants table — **requires export**

**Migration approach:**
1. Export all merchants from Airtable
2. For each, insert into `merchants` with `user_id = NULL` (no auth accounts yet)
3. Set `status = 'pending'` (requires admin approval)
4. Record in `product_migrations` not needed; merchant mapping by email

**Critical:** Do not create merchant records inferred from product data. Only migrate explicit merchant records from Airtable.

### 3.4 Order Migration (Airtable Orders + OrderItems)

**Current state:** Airtable Orders + OrderItems — **requires export**. Frontend has no cart/checkout pages (`cart.html`, `checkout.html` missing).

**Migration approach:**
1. Export Orders and OrderItems from Airtable
2. Migrate Orders → `orders` table (generate UUIDs, map via `product_migrations` for product_id)
3. Migrate OrderItems → `order_items` with `order_id` FK
4. Preserve merchant snapshots on `order_items`
5. If no historical orders exist, skip — new orders created via `/api/order`

### 3.5 Inquiry Migration (Airtable — if any)

**Current state:** `/api/inquiry` logs to Airtable — **check if table exists**

**Migration approach:** If inquiry data exists, migrate to `inquiries` table.

### 3.6 Validation & Rollback Testing

Before considering migration complete:
- [ ] Source row count = destination row count for each table
- [ ] All required fields populated (no NULLs where NOT NULL)
- [ ] FK relationships valid (`merchant_id` references existing merchant, `product_id` references existing product)
- [ ] No duplicate `product_migrations` entries
- [ ] Spot-check 10% of records for data fidelity
- [ ] Rollback test: truncate Supabase tables, re-run migration from source

**Keep Airtable and JSON data intact until all validation passes.**

---

## 4. API Route Mappings (Express → Supabase via Service Role)

**Architecture decision:** Frontend continues calling Express endpoints. Express uses Supabase service-role key (server-side only) to query PostgreSQL. **No direct Supabase queries from frontend. No Edge Functions.**

### 4.1 `GET /api/products` → Express + Supabase

**Current (Express + Airtable):**
```javascript
// server.js
app.get('/api/products', async (req, res) => {
  const { data, error } = await airtableProducts.select();
  res.json(data);
});
```

**Target (Express + Supabase):**
```javascript
// server.js
app.get('/api/products', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});
```

**Notes:**
- Remove `featured = false` filter — return all products (shop page filters client-side)
- Keep response format backward-compatible (array of product objects)
- `supabaseAdmin` = Supabase client with service-role key (server-only)

### 4.2 `POST /api/products` → Express + Supabase (Merchant Form)

**Current:** Validates required fields, uploads image to Cloudinary, inserts to Airtable

**Target:** Express validates, uploads to Cloudinary (unchanged), inserts to Supabase via service role

```javascript
// server.js
app.post('/api/products', async (req, res) => {
  const body = req.body;
  
  // Server-side validation (authoritative)
  const required = ['name', 'category', 'brand', 'price', 'description', 'image'];
  for (const field of required) {
    if (!body[field]) return res.status(400).json({ error: `Missing ${field}` });
  }
  if (Number(body.price) <= 0) return res.status(400).json({ error: 'Price must be > 0' });
  
  // Merchant handling: look up by email, create if new
  let merchantId = null;
  if (body.merchantEmail) {
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('id')
      .eq('merchant_email', body.merchantEmail)
      .single();
    if (merchant) merchantId = merchant.id;
    else {
      const { data: newMerchant, error: mErr } = await supabaseAdmin
        .from('merchants')
        .insert({
          merchant_name: body.merchantName,
          merchant_email: body.merchantEmail,
          merchant_phone: body.merchantPhone,
          merchant_business: body.merchantBusiness,
          merchant_address: body.merchantAddress,
          status: 'pending',
        })
        .select('id')
        .single();
      if (mErr) return res.status(500).json({ error: mErr.message });
      merchantId = newMerchant.id;
    }
  }
  
  // Insert product
  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      name: body.name,
      brand: body.brand,
      category: body.category,
      price: body.price,
      currency: body.currency || 'NGN',
      description: body.description,
      short_description: body.shortDescription,
      image: body.image,
      images: body.images || [],
      rating: body.rating || 0,
      stock: body.stock || 0,
      featured: body.featured || false,
      new_arrival: body.newArrival || false,
      condition: body.condition || '',
      merchant_id: merchantId,
      features: body.features || [],
      specifications: body.specifications || null,
      reviews: body.reviews || null,
    })
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});
```

**Notes:**
- Merchant lookup by **exact email match only** — no fuzzy matching
- New merchants created with `status = 'pending'`, `user_id = NULL`
- Cloudinary upload unchanged (frontend → Cloudinary → returns URL → Express inserts URL)
- Response format: single product object (backward-compatible)

### 4.3 `POST /api/order` → Express + Supabase (Atomic Transaction)

**Current:** Validates form data, creates Airtable Orders + OrderItems

**Target:** Express validates, **authoritative pricing from database**, atomic insert via Supabase RPC or transaction

```javascript
// server.js
app.post('/api/order', async (req, res) => {
  const body = req.body;
  
  // Validation
  const required = ['firstName', 'lastName', 'email', 'phone', 'address', 'country', 'state', 'cartItems', 'orderDate'];
  for (const field of required) {
    if (!body[field]) return res.status(400).json({ error: `Missing ${field}` });
  }
  if (!Array.isArray(body.cartItems) || body.cartItems.length === 0) {
    return res.status(400).json({ error: 'Cart cannot be empty' });
  }
  
  // Authoritative pricing: fetch product prices from DB, compare with submitted
  const productIds = body.cartItems.map(item => item.productId).filter(Boolean);
  const { data: products, error: pErr } = await supabaseAdmin
    .from('products')
    .select('id, price, name, merchant_id, merchant_name, merchant_phone, merchant_business, merchant_address')
    .in('id', productIds);
  
  if (pErr) return res.status(500).json({ error: pErr.message });
  
  const priceMap = new Map(products.map(p => [p.id, p]));
  
  // Validate each item price matches DB (allow small rounding diff)
  for (const item of body.cartItems) {
    const product = priceMap.get(item.productId);
    if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` });
    if (Math.abs(Number(item.price) - Number(product.price)) > 0.01) {
      return res.status(400).json({ error: `Price mismatch for ${product.name}` });
    }
  }
  
  // Atomic order + items via RPC (defined in Section 2)
  const { data: orderId, error } = await supabaseAdmin.rpc('create_order', {
    p_order: {
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email,
      phone: body.phone,
      address: body.address,
      country: body.country,
      state: body.state,
      cart_items: body.cartItems,
      order_date: body.orderDate,
      status: 'pending',
    },
    p_items: body.cartItems.map(item => {
      const product = priceMap.get(item.productId);
      return {
        product_id: item.productId,
        product_name: product?.name || item.productName,
        quantity: item.quantity,
        price: product?.price || item.price, // authoritative price from DB
        merchant_id: product?.merchant_id || null,
        merchant_name: product?.merchant_name || item.merchantName,
        merchant_phone: product?.merchant_phone || item.merchantPhone,
        merchant_business: product?.merchant_business || item.merchantBusiness,
        merchant_address: product?.merchant_address || item.merchantAddress,
      };
    }),
  });
  
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ orderId });
});
```

**Key requirements:**
- **Atomic:** Order + all items succeed or fail together (via `create_order` RPC)
- **Authoritative pricing:** Server fetches prices from `products` table; rejects mismatches
- **Merchant snapshots:** Pulled from product record at order time
- **No payment processing implied** — WhatsApp journey unchanged

### 4.4 `POST /api/inquiry` → Express + Supabase (Inquiries Table)

**Current:** Logs to Airtable, opens WhatsApp URL

**Target:** Express inserts to `inquiries` table, returns WhatsApp URL

```javascript
// server.js
app.post('/api/inquiry', async (req, res) => {
  const { productId, productName, productPrice, merchantPhone } = req.body;
  
  if (!productId || !productName || !merchantPhone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Look up product for merchant_id
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, merchant_id')
    .eq('id', productId)
    .single();
  
  // Insert inquiry (no order created)
  const { data: inquiry, error } = await supabaseAdmin
    .from('inquiries')
    .insert({
      product_id: productId,
      product_name: productName,
      merchant_id: product?.merchant_id || null,
      merchant_phone: merchantPhone,
      // Customer contact only if provided by frontend
      customer_name: req.body.customerName || null,
      customer_phone: req.body.customerPhone || null,
      customer_email: req.body.customerEmail || null,
      status: 'new',
    })
    .select('id')
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Return WhatsApp URL for frontend to open
  const waUrl = `https://wa.me/${merchantPhone.replace(/^0/, '234')}?text=${encodeURIComponent(`Inquiry about ${productName}`)}`;
  res.json({ waUrl, inquiryId: inquiry.id });
});
```

**Notes:**
- **No order created** — inquiry is separate entity
- Customer contact fields optional (only stored if provided)
- Frontend still opens WhatsApp link (journey unchanged)

### 4.5 Response Format Compatibility

| Endpoint | Current Response | Target Response | Breaking Change? |
|----------|------------------|-----------------|------------------|
| `GET /api/products` | Array of products | Array of products | No (same fields, UUID `id`) |
| `POST /api/products` | Created product | Created product | No (same fields, UUID `id`, adds `merchant_id`) |
| `POST /api/order` | `{ orderId }` | `{ orderId }` | No |
| `POST /api/inquiry` | WhatsApp URL (or nothing) | `{ waUrl, inquiryId }` | **Yes** — adds `inquiryId` |

**Frontend impact:** Only `/api/inquiry` response changes (adds `inquiryId`). Frontend can ignore extra field.

---

## 5. Frontend Changes (Minimal — Express API Contract Preserved)

### 5.1 No Direct Supabase Queries from Frontend

**Removed from v1 spec:** All examples showing `supabase.from()` in frontend code. Frontend continues calling `/api/*` endpoints.

### 5.2 `js/utils.js` — `fetchProducts()` (Unchanged Behavior)

```javascript
// utils.js - fetchProducts() — NO CHANGE to calling code
export const fetchProducts = async () => {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    const fallback = await fetch('/data/product.json');
    return fallback.json();
  }
};
```

### 5.3 `js/utils.js` — `buyNowInquiry()` (Unchanged Behavior)

```javascript
// utils.js - buyNowInquiry() — NO CHANGE to calling code
export const buyNowInquiry = async (product, merchant) => {
  try {
    const response = await fetch('/api/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        merchantPhone: merchant.phone,
      }),
    });
    
    if (!response.ok) throw new Error('Inquiry failed');
    
    const { waUrl } = await response.json();
    window.open(waUrl, '_blank');
  } catch (error) {
    console.error('Buy Now inquiry error:', error);
    const waUrl = `https://wa.me/${merchant.phone.replace(/^0/, '234')}`;
    window.open(waUrl, '_blank');
  }
};
```

### 5.4 `js/merchant.js` — Form Submission (Unchanged Behavior)

- Frontend uploads to Cloudinary (unchanged)
- Posts to `/api/products` (unchanged)
- Handles response (unchanged)

### 5.5 No Supabase Client Initialization in Frontend

**Removed from v1 spec:** `main.js` Supabase initialization. Service-role key **never** in frontend.

---

## 6. Security Hardening (Express Layer)

### 6.1 CORS
- **Current:** `cors({ origin: "*" })`
- **Target:** `cors({ origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000' })`
- Configure in `server.js` only

### 6.2 Authentication (Deferred — Requires Approval)

- Supabase Auth not approved
- If approved later: vendor accounts only, linked via `merchants.user_id`
- **No customer accounts** unless explicitly approved
- Backend validates vendor identity via session/JWT before privileged operations

### 6.3 Rate Limiting
- Add `express-rate-limit` middleware to all `/api/*` routes
- Separate limits for read vs write endpoints

### 6.4 Input Validation (Server-Side Authoritative)
- All `POST` endpoints validate required fields, types, ranges
- Price validation against database (see `/api/order`)
- Sanitize text fields (strip scripts, limit length)

### 6.5 XSS Prevention
- Product descriptions stored as TEXT, rendered safely by frontend
- If HTML allowed, sanitize server-side (DOMPurify) before insert

### 6.6 Environment Variables (Server-Only)

| Variable | Purpose | Location |
|----------|---------|----------|
| `SUPABASE_URL` | Supabase project URL | `server.js` only |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (bypasses RLS) | `server.js` only — **never in frontend** |
| `ALLOWED_ORIGINS` | CORS allowlist | `server.js` |
| `AIRTABLE_*` | Keep until migration validated | `server.js` |
| `CLOUDINARY_*` | Keep for merchant uploads | `server.js` + frontend (unsigned preset) |

### 6.7 CSRF Protection
- Add CSRF tokens for state-changing POST endpoints
- Double-submit cookie pattern or `csurf` middleware

---

## 7. Migration Checklist (Revised)

### Phase 0: Prerequisites (Must Complete First)
- [ ] Export all Airtable tables (Products, Merchants, Orders, OrderItems)
- [ ] Inspect Airtable field formats, row counts, data quality
- [ ] Verify which JSON files are actively used by frontend
- [ ] Confirm `cart.json` usage (appears unused — no cart/checkout pages)
- [ ] Get approval on: Supabase Auth scope, image hosting, merchant onboarding, historical order migration

### Phase 1: Infrastructure
- [ ] Create Supabase project
- [ ] Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in Render env vars
- [ ] Run `supabase/schema.sql` (Section 2) in Supabase SQL Editor
- [ ] Verify RLS policies are **disabled** initially (enable after validation)
- [ ] Test service-role connection from Render

### Phase 2: Data Migration
- [ ] Run migration scripts (dry-run first)
- [ ] Record source/destination row counts per table
- [ ] Validate FK relationships, required fields, no duplicates
- [ ] Spot-check data fidelity
- [ ] **Rollback test:** truncate, re-run from source
- [ ] Keep Airtable + JSON intact

### Phase 3: API Migration (Express → Supabase)
- [ ] Update `server.js` to use `supabaseAdmin` for all 4 routes
- [ ] Implement authoritative pricing in `/api/order`
- [ ] Implement `inquiries` table insert in `/api/inquiry`
- [ ] Test all endpoints with Supabase backend
- [ ] Verify response format compatibility
- [ ] Remove Airtable dependencies from `server.js`

### Phase 4: Security Hardening
- [ ] Configure CORS allowlist
- [ ] Add rate limiting
- [ ] Add input validation/sanitization
- [ ] Add CSRF protection
- [ ] **RLS policies:** Enable one table at a time, test thoroughly

### Phase 5: Validation & Cutover
- [ ] End-to-end test: product listing, merchant form, order, inquiry
- [ ] Verify frontend works unchanged
- [ ] Monitor Supabase usage/performance
- [ ] Cutover: point production to new backend

### Phase 6: Post-Migration
- [ ] Backup Airtable (keep for 90 days)
- [ ] Decommission Airtable API keys
- [ ] Document new schema and API contracts

---

## 8. Rollback Strategy (Database-Aware)

**Git revert does not reverse database writes.** Separate database rollback required.

### 8.1 Code Rollback (Git)
- Revert `server.js` to Airtable version
- Redeploy to Render
- **Does not affect Supabase data**

### 8.2 Database Rollback (Supabase)
If migration validation fails or cutover issues:
1. **Truncate all migrated tables** in Supabase (preserves schema)
2. **Re-run migration from source** (Airtable + JSON) after fixes
3. If schema changes needed: create new migration SQL, apply, re-migrate

### 8.3 Full Rollback (Return to Airtable)
1. Revert `server.js` to Airtable version (Git)
2. Redeploy to Render
3. Supabase project retained for investigation
4. **Do not delete Airtable base or records** until cutover confirmed stable for 30 days

### 8.4 Recovery Point Verification
- Commit `c8d77f4498d4476e5f4f5b13af1c35b0ad2dee64` is the pre-migration baseline
- **Verify** this commit builds and runs correctly before relying on it
- Tag the commit: `git tag pre-migration-baseline`

---

## 9. Decisions Requiring Your Approval

| # | Decision | Status | Notes |
|---|----------|--------|-------|
| 1 | **Supabase Auth for vendors** | ❌ Not approved | Current: no auth. Proposed: vendor signup/login linked to `merchants.user_id`. Requires approval before implementation. |
| 2 | **Supabase Storage for images** | ❌ Not approved | Current: Cloudinary unsigned preset. Proposed: migrate to Supabase Storage. Requires approval. |
| 3 | **Merchant onboarding flow** | ❌ Not approved | Current: form → Airtable → manual review. Proposed: form → Supabase → `status='pending'` → admin approval. Email notifications? Auto-approval? |
| 4 | **Historical order migration** | ❌ Not approved | Airtable Orders/OrderItems may have data. Export and inspect first. Decision: migrate all, migrate none, or migrate recent only? |
| 5 | **Customer accounts** | ❌ Not approved | Terms state no accounts required. Do not implement without explicit approval. |
| 6 | **Payment processing** | ❌ Not approved | Current: WhatsApp only. No payment gateway. Do not imply or design for payments. |
| 7 | **JSON file migration scope** | ❌ Not approved | `promos.json`, `shipping-zones.json`, `tax-rates.json`, `lga-towns.json` — confirm each is actively used before creating tables. `cart.json` appears unused. |
| 8 | **RLS policy designs** | ❌ Not validated | All RLS policies in Section 2 are proposals. Must be validated against actual access patterns before enabling. |
| 9 | **Merchant identity linking** | ❌ Not approved | How to link existing Airtable merchants to future Supabase Auth accounts? Email match? Manual? |
| 10 | **Inquiry-to-order conversion tracking** | ❌ Not approved | `inquiries.status` includes `'converted'` — who updates this? Manual? Webhook? |

---

## 10. Classification of Statements

| Category | Label | Meaning |
|----------|-------|---------|
| **Verified** | ✅ | Observed in current codebase (source files, audit commit `c8d77f4498d4476e5f4f5b13af1c35b0ad2dee64`) |
| **Proposed Design** | 📐 | Design proposal in this spec — requires review/approval |
| **Assumption** | ⚠️ | Inferred from code but not directly verified — flagged for confirmation |
| **Decision Required** | ❌ | Explicit approval needed before implementation |

**Examples in this document:**
- "Current state: 20 products in `data/product.json`" → ✅ Verified
- "Add `merchant_id` FK on products" → 📐 Proposed design
- "Airtable Products table has same fields as JSON" → ⚠️ Assumption (requires export)
- "Enable Supabase Auth for vendors" → ❌ Decision required

---

## 11. References

- **Current codebase:** `server.js`, `js/utils.js`, `js/merchant.js`, `js/main.js`, `data/product.json`, `index.html`, `shop.html`, `product-details.html`, `merchant.html`, `contact.html`, `terms.html`, `product.html`
- **Airtable tables:** Products, Merchants, Orders, OrderItems (schemas unverified — require export)
- **Supabase docs:** https://supabase.com/docs
- **Row Level Security:** https://supabase.com/docs/guides/row-level-security
- **PostgreSQL transactions:** https://www.postgresql.org/docs/current/tutorial-transactions.html

---

**Document revised:** Based on audit commit `c8d77f4498d4476e5f4f5b13af1c35b0ad2dee64` and review requirements  
**Next action:** Review with stakeholder, approve/reject decisions in Section 9, then begin Phase 0 prerequisites