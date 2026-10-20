# EgoTech E-commerce Migration Specification

**Version:** 1.0  
**Branch:** `techpoint-v2`  
**Target:** Supabase PostgreSQL  
**Source:** Airtable + local JSON files  
**Status:** Draft — for review and approval

---

## 1. Overview

This document defines the migration of the EgoTech e-commerce platform from the current architecture (Node.js + Express + Airtable + JSON data files) to a Supabase-powered stack (PostgreSQL + Supabase Auth + Edge Functions).

### 1.1 Current State
- Static HTML frontend (no framework)
- Node.js/Express backend on Render
- Airtable as primary database (4 tables: Products, Merchants, Orders, OrderItems)
- Local JSON fallbacks for product data (`data/product.json`, `data/promos.json`, etc.)
- No user authentication
- Off-platform transactions via WhatsApp
- Open CORS (`origin: "*"`)
- Hardcoded Cloudinary unsigned preset in client code

### 1.2 Target State
- Supabase PostgreSQL as primary database
- Supabase Auth for user management
- Edge Functions or lightweight Node.js server for API routes
- Static frontend unchanged (backward compatible)
- Row-level security (RLS) on all tables
- Proper CORS configuration

---

## 2. Database Schema

All tables use Supabase conventions: `id` as UUID primary key, `created_at`/`updated_at` timestamps, RLS enabled.

### 2.1 `products` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Product unique identifier |
| `name` | TEXT | NOT NULL | Product name |
| `brand` | TEXT | — | Brand name (HP, Dell, Apple, etc.) |
| `category` | TEXT | — | Product category |
| `price` | DECIMAL(10,2) | NOT NULL, CHECK (`price` > 0) | Price in NGN |
| `currency` | TEXT | DEFAULT `'NGN'` | Currency code |
| `description` | TEXT | — | Full product description (HTML stored as text) |
| `short_description` | TEXT | — | Short summary (max 120 chars) |
| `image` | TEXT | — | Main image URL (Cloudinary) |
| `images` | TEXT[] | — | Array of image URLs |
| `rating` | DECIMAL(3,1) | DEFAULT 0, CHECK (`rating` >= 0 AND `rating` <= 5) | Average star rating |
| `stock` | INTEGER | DEFAULT 0, CHECK (`stock` >= 0) | Inventory count |
| `featured` | BOOLEAN | DEFAULT FALSE | Featured product flag |
| `new_arrival` | BOOLEAN | DEFAULT FALSE | New arrival flag |
| `condition` | TEXT | CHECK (`condition` IN (`'NEW'`, `'USED'`, `'REFURBISHED'`, `''`)) | Product condition |
| `merchant_name` | TEXT | — | Denormalized — vendor name |
| `merchant_phone` | TEXT | — | Denormalized — vendor phone |
| `merchant_business` | TEXT | — | Denormalized — vendor business name |
| `merchant_address` | TEXT | — | Denormalized — vendor address |
| `features` | TEXT[] | — | Array of feature strings |
| `specifications` | JSONB | — | Key-value spec pairs |
| `reviews` | JSONB | — | Array of {name, rating, date, comment} |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | Last update timestamp |

**RLS Policy:** Vendors can SELECT/INSERT their own products. Admins have full access.

---

### 2.2 `merchants` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Merchant unique identifier |
| `merchant_name` | TEXT | NOT NULL | Full name of vendor |
| `merchant_email` | TEXT | NOT NULL, UNIQUE | Email address |
| `merchant_phone` | TEXT | NOT NULL | Phone number (E.164 format) |
| `merchant_business` | TEXT | NOT NULL | Business/store name |
| `merchant_address` | TEXT | NOT NULL | Business address |
| `status` | TEXT | DEFAULT `'pending'`, CHECK (`status` IN (`'pending'`, `'approved'`, `'rejected'`)) | Account approval status |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT `now()` | Last status update |

**RLS Policy:** Vendors can SELECT/UPDATE their own row. Admins have full access.

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
| `cart_items` | JSONB | NOT NULL | Array of {product_id, product_name, quantity, price} |
| `order_date` | TIMESTAMPTZ | NOT NULL | Order placement timestamp |
| `status` | TEXT | DEFAULT `'pending'`, CHECK (`status` IN (`'pending'`, `'confirmed'`, `'shipped'`, `'delivered'`, `'cancelled'`)) | Order lifecycle status |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Creation timestamp |

**RLS Policy:** Customers can SELECT their own orders. Admins have full access.

---

### 2.4 `order_items` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | Order item unique identifier |
| `order_id` | UUID | NOT NULL, REFERENCES `orders(id)` ON DELETE CASCADE | Parent order |
| `product_name` | TEXT | NOT NULL | Product name at time of purchase |
| `product_id` | TEXT | — | Product ID (may be original Airtable/JSON ID) |
| `quantity` | INTEGER | NOT NULL, CHECK (`quantity` > 0) | Number of units |
| `price` | DECIMAL(10,2) | NOT NULL, CHECK (`price` > 0) | Unit price at purchase |
| `merchant_name` | TEXT | NOT NULL | Vendor name |
| `merchant_phone` | TEXT | — | Vendor phone |
| `merchant_business` | TEXT | — | Vendor business name |
| `merchant_address` | TEXT | — | Vendor address |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Creation timestamp |

**RLS Policy:** Customers can SELECT items from their own orders. Admins have full access.

---

### 2.5 `profiles` Table (Supabase Auth integration)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, REFERENCES `auth.users(id)` | Linked to Supabase Auth |
| `full_name` | TEXT | — | User's full name |
| `role` | TEXT | DEFAULT `'customer'`, CHECK (`role` IN (`'customer'`, `'vendor'`)) | User role |
| `phone` | TEXT | — | User's phone number |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` | Profile creation timestamp |

---

## 3. Data Migration Plan

### 3.1 Product Data (`data/product.json`)

**Current state:** 20 products with inconsistent schema:
- Products 1-10: Basic fields (name, brand, category, price, description, image, rating, stock, featured, newArrival, condition)
- Products 11-20: Include denormalized merchant fields (merchantName, merchantPhone, merchantBusiness, merchantAddress)

**Migration approach:**
1. Parse `data/product.json`
2. For products 1-10: Set `merchant_name`, `merchant_phone`, `merchant_business`, `merchant_address` to `NULL` or default values
3. For products 11-20: Extract merchant fields and create corresponding `merchants` table rows
4. Map product IDs: JSON integers → UUIDs (store mapping for reference)
5. Convert `images` from comma-separated string to TEXT[] array
6. Convert `specifications` and `reviews` from stored format to JSONB

**Sample migration script (Node.js):**
```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const products = JSON.parse(fs.readFileSync('data/product.json', 'utf8'));

for (const product of products) {
  const { data, error } = await supa
    .from('products')
    .insert({
      id: product.id, // Will be UUID generated by DB default
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      currency: product.currency || 'NGN',
      description: product.description,
      short_description: product.shortDescription,
      image: product.image,
      images: product.images ? product.images.split(',').map(u => u.trim()) : [],
      rating: product.rating || 0,
      stock: product.stock || 0,
      featured: product.featured || false,
      new_arrival: product.newArrival || false,
      condition: product.condition || '',
      // Merchant fields - NULL for products 1-10, actual values for 11-20
      merchant_name: product.merchantName || null,
      merchant_phone: product.merchantPhone || null,
      merchant_business: product.merchantBusiness || null,
      merchant_address: product.merchantAddress || null,
      features: product.features || [],
      specifications: product.specifications ? JSON.stringify(product.specifications) : null,
      reviews: product.reviews ? JSON.stringify(product.reviews) : null,
    })
    .select();
  
  if (error) console.error(`Error migrating product ${product.name}:`, error);
}
```

### 3.2 Merchant Data

**Current state:** Airtable Merchants table (records from merchant form submissions)

**Migration approach:**
1. Export all merchants from Airtable
2. For each merchant, insert into `merchants` table
3. Link products to merchants via `merchant_name`/`merchant_email` (or add `merchant_id` UUID foreign key later)
4. Set initial `status` to `'pending'` (requires admin approval)

### 3.3 Order Data

**Current state:** No orders in the static frontend (cart/checkout missing). Airtable Orders + OrderItems tables may have historical data.

**Migration approach:**
1. If historical orders exist in Airtable, export and migrate
2. Since the new version doesn't have cart/checkout yet, orders will be created via the new `/api/order` endpoint
3. Map Airtable order IDs to Supabase UUIDs if needed

### 3.4 OrderItems Data

**Current state:** Airtable OrderItems table (denormalized with merchant info)

**Migration approach:**
1. Export from Airtable
2. Insert into `order_items` table with `order_id` foreign key
3. Preserve `product_id`, `quantity`, `price`, and merchant denormalized fields

---

## 4. API Route Mappings

### 4.1 `GET /api/products` → Supabase Query

**Current:**
```javascript
// server.js
app.get('/api/products', async (req, res) => {
  const { data, error } = await airtableProducts.select();
  res.json(data);
});
```

**Target:** Supabase Edge Function or direct query

```javascript
// Edge Function: /api/products
export default async function handler(req) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('featured', true) // Optional filtering
    .order('created_at', { ascending: false });
  
  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify(data), { status: 200 });
}
```

### 4.2 `POST /api/products` → Supabase Insert

**Current:** Validates required fields, uploads image to Cloudinary, inserts to Airtable

**Target:** Supabase with storage + RLS

```javascript
// Edge Function: /api/products
export default async function handler(req) {
  const body = await req.json();
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: body.name,
      brand: body.brand,
      category: body.category,
      price: body.price,
      currency: body.currency || 'NGN',
      description: body.description,
      short_description: body.shortDescription,
      image: body.imageUrl, // Cloudinary URL from upload
      images: body.imageUrls, // Array of Cloudinary URLs
      rating: body.rating,
      stock: body.stock,
      featured: body.featured,
      new_arrival: body.newArrival,
      condition: body.condition,
      merchant_name: body.merchantName,
      merchant_phone: body.merchantPhone,
      merchant_business: body.merchantBusiness,
      merchant_address: body.merchantAddress,
      features: body.features,
      specifications: body.specifications,
      reviews: body.reviews,
    })
    .select();
  
  // Also create merchant row if new vendor
  if (body.isNewVendor) {
    await supabase.from('merchants').insert({
      merchant_name: body.merchantName,
      merchant_email: body.merchantEmail,
      merchant_phone: body.merchantPhone,
      merchant_business: body.merchantBusiness,
      merchant_address: body.merchantAddress,
      status: 'pending',
    });
  }
  
  if (error) return new Response(error.message, { status: 500 });
  return new Response(JSON.stringify(data), { status: 201 });
}
```

### 4.3 `POST /api/order` → Supabase Transaction

**Current:** Validates form data, creates Airtable Orders + OrderItems records

**Target:** Supabase with proper validation and RLS

```javascript
// Edge Function: /api/order
export default async function handler(req) {
  const body = await req.json();
  
  // Validation
  if (!body.firstName || !body.lastName || !body.email || !body.phone) {
    return new Response('Missing required fields', { status: 400 });
  }
  
  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
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
    })
    .select();
  
  if (orderError) return new Response(orderError.message, { status: 500 });
  
  // Create order items
  for (const item of body.cartItems) {
    await supabase.from('order_items').insert({
      order_id: order[0].id,
      product_name: item.productName,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      merchant_name: item.merchantName,
      merchant_phone: item.merchantPhone,
      merchant_business: item.merchantBusiness,
      merchant_address: item.merchantAddress,
    });
  }
  
  // TODO: Trigger WhatsApp inquiry (same as current /api/inquiry)
  
  return new Response(JSON.stringify({ orderId: order[0].id }), { status: 201 });
}
```

### 4.4 `POST /api/inquiry` → WhatsApp + Order Creation

**Current:** Logs inquiry to Airtable, opens WhatsApp URL

**Target:** Same behavior but with Supabase-backed order creation

```javascript
// Edge Function: /api/inquiry
export default async function handler(req) {
  const body = await req.json();
  const { productId, productName, productPrice, merchantPhone } = body;
  
  // Create order item for the inquiry
  const { data, error } = await supabase
    .from('orders')
    .insert({
      first_name: '',
      last_name: '',
      email: '',
      phone: merchantPhone,
      address: '',
      country: 'Nigeria',
      state: '',
      cart_items: JSON.stringify([{
        productId,
        productName,
        quantity: 1,
        price: productPrice,
      }]),
      order_date: new Date().toISOString(),
      status: 'pending',
    })
    .select();
  
  if (error) return new Response(error.message, { status: 500 });
  
  // Open WhatsApp (same as current frontend logic)
  const waUrl = `https://wa.me/${merchantPhone.replace(/^0/, '234')}`;
  
  // Return WhatsApp URL for frontend to open
  return new Response(JSON.stringify({ waUrl, orderId: data[0].id }), { status: 200 });
}
```

### 4.5 Other Routes

| Current Route | Target |
|--------------|--------|
| `GET /` (health check) | Same, or Supabase health check |
| `POST /api/inquiry` | Edge Function as above |
| Static file serving | Supabase Edge Functions or CDN |

---

## 5. Frontend Changes

### 5.1 `js/utils.js` — `fetchProducts()`

**Current:** Fetches from both backend API and `data/product.json` via `Promise.allSettled`

**Target:** Fetch from Supabase only (or keep JSON fallback for offline/dev mode)

```javascript
// utils.js - fetchProducts()
export const fetchProducts = async () => {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('featured', false);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching products from Supabase:', error);
    // Fallback to JSON (for dev/offline)
    const fallback = await fetch('/data/product.json');
    return fallback.json();
  }
};
```

**Note:** Supabase client initialization needs to happen early in the app (in `main.js` or `index.html`).

### 5.2 `js/utils.js` — `buyNowInquiry()`

**Current:** Calls `/api/inquiry`, opens WhatsApp, errors swallowed

**Target:** Same behavior, but API now calls Supabase Edge Function

```javascript
// utils.js - buyNowInquiry()
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
    // Fallback: open WhatsApp directly
    const waUrl = `https://wa.me/${merchant.phone.replace(/^0/, '234')}`;
    window.open(waUrl, '_blank');
  }
};
```

### 5.3 `js/merchant.js` — Form Submission

**Current:** Uploads to Cloudinary via unsigned preset, posts to `/api/products`

**Target:** Upload to Supabase Storage, then create product + merchant records

```javascript
// merchant.js - form submission
document.getElementById('merchantForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Collect form data
  const formData = {
    productName: document.getElementById('productName').value,
    productBrand: document.getElementById('productBrand').value,
    productCategory: document.getElementById('productCategory').value,
    productPrice: document.getElementById('productPrice').value,
    productShortDesc: document.getElementById('productShortDesc').value,
    productDesc: document.getElementById('productDesc').value,
    // ... other fields
  };
  
  // Upload images to Supabase Storage instead of Cloudinary
  // ... image upload logic using supabase.storage.upload()
  
  // Create product + merchant in one transaction
  const { error } = await supabase.rpc('submit_product', {
    // Or use a stored procedure / edge function
  });
  
  if (error) {
    showError(error.message);
  } else {
    showSuccess();
    resetForm();
  }
});
```

**Alternative:** Keep using Cloudinary for image hosting, but change the API endpoint from `https://egotech.onrender.com/api/products` to the Supabase Edge Function.

### 5.4 `js/main.js` — Supabase Initialization

**Current:** No Supabase integration

**Target:** Initialize Supabase client and make it available to all pages

```javascript
// main.js - at the top
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Now available as window.supabase or via import in other scripts
window.supabase = supabase;
```

### 5.5 Authentication Integration

**Current:** No auth (Terms state "does not require visitors or customers to create an account")

**Target:** Add Supabase Auth optionally for vendors only

- **Customers:** Can browse without auth (public access)
- **Vendors:** Must sign up/log in to submit products
- **RLS policies:** Vendors can only CRUD their own products/merchants

```sql
-- Enable Supabase Auth for vendors
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can insert their own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICy "Vendors can update their own products"
  ON products FOR UPDATE
  TO authenticated
  USING (merchant_name = current_setting('app.vendor_name'));

-- Public read access
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO public
  USING (true);
```

---

## 6. Security Hardening

### 6.1 CORS
- **Current:** `cors({ origin: "*" })`
- **Target:** `cors({ origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000' })`
- **Edge Functions:** Configure CORS headers in each function response

### 6.2 Authentication
- Enable Supabase Auth
- Use email/password or social login (Google, GitHub)
- Protect vendor-only routes with `supabase.auth.getUser()`

### 6.3 Rate Limiting
- Add middleware: `npm install express-rate-limit`
- Or configure at Edge Function level (Supabase limits per-project)

### 6.4 Input Validation
- Use `zod` or `joi` for schema validation
- Sanitize product descriptions (escape HTML entities before storing)
- Validate email format, phone format, price > 0

### 6.5 XSS Prevention
- Never use `innerHTML` with unsanitized data
- If product descriptions contain HTML, use a sanitizer (DOMPurify)
- Store descriptions as TEXT, render safely

### 6.6 Environment Variables
| Variable | Current | Target |
|----------|---------|--------|
| `AIRTABLE_API_URL` | Used in server.js | Remove (migrate to Supabase) |
| `AIRTABLE_TOKEN` | Used in server.js | Remove |
| `AIRTABLE_PRODUCTS_URL` | Used in server.js | Remove |
| `AIRTABLE_MERCHANTS_URL` | Used in server.js | Remove |
| `AIRTABLE_ORDER_ITEMS_URL` | Used in server.js | Remove |
| `CLOUDINARY_PRESET` | `rezukj30` in merchant.js | Remove (use Supabase Storage) |
| `SUPABASE_URL` | — | New |
| `SUPABASE_ANON_KEY` | — | New |
| `SUPABASE_SERVICE_ROLE_KEY` | — | New |
| `ALLOWED_ORIGINS` | — | New (replace `*`) |

### 6.7 CSRF Protection
- Add CSRF tokens for state-changing POST requests
- Supabase Auth provides automatic CSRF protection for its endpoints

---

## 7. Migration Checklist

### Phase 1: Infrastructure ✅
- [ ] Create Supabase project
- [ ] Set up environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- [ ] Enable required APIs (PostgREST, Storage, Auth)
- [ ] Create database tables (schema from Section 2)
- [ ] Set up RLS policies

### Phase 2: Data Migration 🔄
- [ ] Export Airtable records (Products, Merchants, Orders, OrderItems)
- [ ] Parse `data/product.json` and `data/promos.json`, etc.
- [ ] Run migration scripts (Node.js or Supabase SQL)
- [ ] Verify data integrity (row counts, field mappings)
- [ ] Test product listing, merchant form, order creation

### Phase 3: API Migration 🔄
- [ ] Create Edge Functions for: `/api/products`, `/api/order`, `/api/inquiry`
- [ ] Update `server.js` to route to Edge Functions (or delete if no longer needed)
- [ ] Test all API endpoints with Supabase backend
- [ ] Remove Airtable dependencies from server.js

### Phase 4: Frontend Migration 🔄
- [ ] Add Supabase client initialization to `main.js`
- [ ] Update `utils.js` `fetchProducts()` to use Supabase
- [ ] Update `merchant.js` to use Supabase Storage + API
- [ ] Update `buyNowInquiry()` WhatsApp flow
- [ ] Keep HTML pages unchanged (backward compatible)
- [ ] Test all pages: index, shop, product-details, merchant, contact, terms

### Phase 5: Security & Polish ✅
- [ ] Configure CORS (replace `origin: "*"`)
- [ ] Set up Supabase Auth (vendors only, or customers if needed)
- [ ] Add rate limiting
- [ ] Add input validation and XSS sanitization
- [ ] Remove hardcoded Cloudinary preset from client code
- [ ] Test form submissions, error handling
- [ ] Deploy to production (Supabase free tier or paid plan)

### Phase 6: Post-Migration 🔄
- [ ] Monitor Supabase usage and performance
- [ ] Backup Airtable data until migration is confirmed stable
- [ ] Update documentation
- [ ] Train team on new Supabase dashboard (if applicable)
- [ ] Plan future features: user accounts, cart/checkout, payment gateway

---

## 8. Rollback Plan

If migration fails or causes critical issues:

1. **Keep Airtable active** — Do not delete Airtable base or records until Supabase is confirmed stable
2. **Revert `server.js`** — Restore original Airtable API routes
3. **Restore JSON fallbacks** — Ensure `data/` directory remains intact
4. **Deploy previous version** — The `techpoint-v2` branch can be rolled back to commit `c8d77f4498d4476e5f4f5b13af1c35b0ad2dee64`
5. **Data sync** — If some data migrated to Supabase, use Airtable as source of truth until issues resolved

**Communication:** Notify stakeholders if migration is paused or reverted. The existing site (`techpoint-v2` branch) must remain functional during the transition.

---

## 9. Open Questions / Decisions Needed

| Question | Options | Recommendation |
|----------|---------|----------------|
| **Image hosting** | Keep Cloudinary, migrate to Supabase Storage, or use both? | Supabase Storage (simpler, unified with DB) — but Cloudinary has better image transformations |
| **Authentication** | No auth, Supabase Auth (email+password), Supabase Auth (social) | No auth for customers (current model); Supabase Auth for vendors only |
| **Product IDs** | Keep JSON integer IDs, switch to UUIDs, or use mapping table? | UUIDs in Supabase, map old IDs in a `product_migrations` table for reference |
| **Merchant onboarding** | Manual approval via Supabase Dashboard, automated email flow, or both? | Manual approval initially (set merchant status to `'pending'`), then email notifications |
| **Email notifications** | Supabase built-in, SendGrid integration, or none? | Supabase Auth emails + custom SendGrid for order confirmations if needed |
| **Search functionality** | Supabase native search, Algolia integration, or client-side only? | Start with client-side filtering; add Algolia or Supabase full-text search later |

---

## 10. References

- **Current codebase:** `server.js`, `js/utils.js`, `js/merchant.js`, `js/main.js`, `data/product.json`
- **Airtable tables:** Products, Merchants, Orders, OrderItems
- **Supabase docs:** https://supabase.com/docs
- **Edge Functions:** https://supabase.com/docs/guides/functions
- **Row Level Security:** https://supabase.com/docs/guides/row-level-security
- **Storage API:** https://supabase.com/docs/guides/storage

---

**Document prepared:** Based on audit commit `c8d77f4498d4476e5f4f5b13af1c35b0ad2dee64`  
**Next action:** Review with team, approve migration approach, begin Phase 1 infrastructure setup