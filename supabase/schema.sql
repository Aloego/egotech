-- EgoTech E-commerce — Supabase Schema
-- Phase 1: Infrastructure setup
-- Run in Supabase SQL Editor or via `supabase db push`

-- ═══════════════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER FUNCTION
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════════════════════

-- ── Merchants ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.merchants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_name     TEXT NOT NULL,
  merchant_email    TEXT NOT NULL UNIQUE,
  merchant_phone    TEXT NOT NULL,
  merchant_business TEXT NOT NULL,
  merchant_address  TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Products ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  brand             TEXT,
  category          TEXT,
  price             DECIMAL(10,2) NOT NULL CHECK (price > 0),
  currency          TEXT NOT NULL DEFAULT 'NGN',
  description       TEXT,
  short_description TEXT,
  image             TEXT,
  images            TEXT[] DEFAULT '{}',
  rating            DECIMAL(3,1) NOT NULL DEFAULT 0
                    CHECK (rating >= 0 AND rating <= 5),
  stock             INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  featured          BOOLEAN NOT NULL DEFAULT false,
  new_arrival       BOOLEAN NOT NULL DEFAULT false,
  condition         TEXT NOT NULL DEFAULT ''
                    CHECK (condition IN ('NEW', 'USED', 'REFURBISHED', '')),
  merchant_name     TEXT,
  merchant_phone    TEXT,
  merchant_business TEXT,
  merchant_address  TEXT,
  features          TEXT[] DEFAULT '{}',
  specifications    JSONB,
  reviews           JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL,
  address    TEXT NOT NULL,
  country    TEXT NOT NULL,
  state      TEXT NOT NULL,
  cart_items JSONB NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Order Items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_name     TEXT NOT NULL,
  product_id       TEXT,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  price            DECIMAL(10,2) NOT NULL CHECK (price > 0),
  merchant_name    TEXT NOT NULL,
  merchant_phone   TEXT,
  merchant_business TEXT,
  merchant_address TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Profiles (Supabase Auth link) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  role       TEXT NOT NULL DEFAULT 'customer'
             CHECK (role IN ('customer', 'vendor')),
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Product ID migration mapping ──────────────────────────
-- Preserves legacy Airtable / JSON IDs so historical data stays traceable.
CREATE TABLE IF NOT EXISTS public.product_migrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id   TEXT NOT NULL UNIQUE,
  product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source      TEXT NOT NULL CHECK (source IN ('airtable', 'json')),
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_products_category      ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand         ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_featured      ON public.products(featured);
CREATE INDEX IF NOT EXISTS idx_products_new_arrival   ON public.products(new_arrival);
CREATE INDEX IF NOT EXISTS idx_products_merchant      ON public.products(merchant_name);
CREATE INDEX IF NOT EXISTS idx_products_created_at    ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_email           ON public.orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at      ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id   ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_merchants_status       ON public.merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_email        ON public.merchants(merchant_email);

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS trg_merchants_updated_at ON public.merchants;
CREATE TRIGGER trg_merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_migrations ENABLE ROW LEVEL SECURITY;

-- ── Products policies ─────────────────────────────────────
-- Everyone can browse products (public storefront, no login required).
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated vendors can insert products (merchant form).
DROP POLICY IF EXISTS "products_vendor_insert" ON public.products;
CREATE POLICY "products_vendor_insert"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Vendors can update products they own (matched on merchant email -> name).
DROP POLICY IF EXISTS "products_vendor_update_own" ON public.products;
CREATE POLICY "products_vendor_update_own"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    merchant_name = (
      SELECT m.merchant_name
      FROM public.merchants m
      WHERE m.merchant_email = auth.jwt() ->> 'email'
    )
  );

-- Vendors can delete products they own.
DROP POLICY IF EXISTS "products_vendor_delete_own" ON public.products;
CREATE POLICY "products_vendor_delete_own"
  ON public.products FOR DELETE
  TO authenticated
  USING (
    merchant_name = (
      SELECT m.merchant_name
      FROM public.merchants m
      WHERE m.merchant_email = auth.jwt() ->> 'email'
    )
  );

-- ── Merchants policies ────────────────────────────────────
DROP POLICY IF EXISTS "merchants_public_read" ON public.merchants;
CREATE POLICY "merchants_public_read"
  ON public.merchants FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "merchants_vendor_update_own" ON public.merchants;
CREATE POLICY "merchants_vendor_update_own"
  ON public.merchants FOR UPDATE
  TO authenticated
  USING (merchant_email = auth.jwt() ->> 'email');

-- ── Orders policies ───────────────────────────────────────
-- Customers can read their own orders; admins (service role) bypass RLS.
DROP POLICY IF EXISTS "orders_owner_read" ON public.orders;
CREATE POLICY "orders_owner_read"
  ON public.orders FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- Anyone (including anon) can create an order — checkout is guest-friendly.
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
CREATE POLICY "orders_public_insert"
  ON public.orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ── Order items policies ──────────────────────────────────
DROP POLICY IF EXISTS "order_items_owner_read" ON public.order_items;
CREATE POLICY "order_items_owner_read"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      WHERE o.email = auth.jwt() ->> 'email'
    )
  );

-- ═══════════════════════════════════════════════════════════
-- STORAGE BUCKET (product images)
-- ═══════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_vendor_insert" ON storage.objects;
CREATE POLICY "product_images_vendor_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "product_images_vendor_delete_own" ON storage.objects;
CREATE POLICY "product_images_vendor_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ═══════════════════════════════════════════════════════════
-- NEW PROFILE ON SIGNUP
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', 'customer')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════
-- PRODUCT SUBMISSION FUNCTION (atomic product + merchant)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.submit_product(
  p_product JSONB,
  p_merchant JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  -- Create the product
  INSERT INTO public.products (
    name, brand, category, price, currency, description, short_description,
    image, images, rating, stock, featured, new_arrival, condition,
    merchant_name, merchant_phone, merchant_business, merchant_address,
    features, specifications, reviews
  )
  VALUES (
    p_product ->> 'name',
    p_product ->> 'brand',
    p_product ->> 'category',
    (p_product ->> 'price')::DECIMAL(10,2),
    COALESCE(p_product ->> 'currency', 'NGN'),
    p_product ->> 'description',
    p_product ->> 'short_description',
    p_product ->> 'image',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_product -> 'images')), '{}'),
    COALESCE((p_product ->> 'rating')::DECIMAL(3,1), 0),
    COALESCE((p_product ->> 'stock')::INTEGER, 0),
    COALESCE((p_product ->> 'featured')::BOOLEAN, false),
    COALESCE((p_product ->> 'new_arrival')::BOOLEAN, false),
    COALESCE(p_product ->> 'condition', ''),
    p_product ->> 'merchant_name',
    p_product ->> 'merchant_phone',
    p_product ->> 'merchant_business',
    p_product ->> 'merchant_address',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_product -> 'features')), '{}'),
    p_product -> 'specifications',
    p_product -> 'reviews'
  )
  RETURNING id INTO v_product_id;

  -- Upsert the merchant (matched on email)
  IF p_merchant ? 'merchant_email' THEN
    INSERT INTO public.merchants (
      merchant_name, merchant_email, merchant_phone,
      merchant_business, merchant_address, status
    )
    VALUES (
      p_merchant ->> 'merchant_name',
      p_merchant ->> 'merchant_email',
      p_merchant ->> 'merchant_phone',
      p_merchant ->> 'merchant_business',
      p_merchant ->> 'merchant_address',
      'pending'
    )
    ON CONFLICT (merchant_email) DO NOTHING;
  END IF;

  RETURN v_product_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- ORDER CREATION FUNCTION (atomic order + items)
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_order(
  p_order JSONB,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
BEGIN
  INSERT INTO public.orders (
    first_name, last_name, email, phone,
    address, country, state, cart_items, order_date, status
  )
  VALUES (
    p_order ->> 'first_name',
    p_order ->> 'last_name',
    p_order ->> 'email',
    p_order ->> 'phone',
    p_order ->> 'address',
    p_order ->> 'country',
    p_order ->> 'state',
    p_order ->> 'cart_items',
    COALESCE((p_order ->> 'order_date')::TIMESTAMPTZ, now()),
    COALESCE(p_order ->> 'status', 'pending')
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (
      order_id, product_name, product_id, quantity, price,
      merchant_name, merchant_phone, merchant_business, merchant_address
    )
    VALUES (
      v_order_id,
      v_item ->> 'product_name',
      v_item ->> 'product_id',
      (v_item ->> 'quantity')::INTEGER,
      (v_item ->> 'price')::DECIMAL(10,2),
      v_item ->> 'merchant_name',
      v_item ->> 'merchant_phone',
      v_item ->> 'merchant_business',
      v_item ->> 'merchant_address'
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- HELPER VIEW: products with merchant info joined
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.products_with_merchants AS
SELECT
  p.*,
  m.id AS merchant_id,
  m.status AS merchant_status,
  m.merchant_email
FROM public.products p
LEFT JOIN public.merchants m
  ON m.merchant_name = p.merchant_name
  AND m.merchant_phone = p.merchant_phone;
