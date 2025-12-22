# EgoTech E-commerce Platform - AI Agent Instructions

## Project Overview

EgoTech is a **vanilla JavaScript e-commerce platform** for electronics, targeting West African markets (Nigeria, Ghana, Benin, Togo, Ivory Coast). It uses **no build tools or frameworks** - just HTML, CSS (Bootstrap 5), and plain JavaScript with a JSON-based data architecture.

## Architecture & Data Flow

### Core Pattern: localStorage as State Management

All client state persists in localStorage with specific keys:

- `egotec_cart_items` - Shopping cart (synced across cart.js, cart-dropdown.js, checkout.js)
- `egotech_user_location` - User's country/state/LGA selection
- `egotech_checkout` - Checkout form data
- `egotech_lga_towns` - Learned town→LGA mappings from user inputs

**Critical**: When modifying cart state, always call `saveCart()` to trigger localStorage sync and update dropdown badge via `window.EgoTechCartDropdown`.

### JSON Data Sources (data/)

- **product.json** - Product catalog with inventory, pricing, features, reviews
- **shipping-zones.json** - Hierarchical zones: country → state → LGA → rate/threshold
- **tax-rates.json** - Tax configuration by location
- **lga-towns.json** - Growable mapping of towns to LGAs (user-contributed)

### Nigerian Location Hierarchy

Lagos and Abuja use a 4-level system: Country → State → LGA (Local Government Area) → Town.
Other states use: Country → State → City. LGA dropdown only appears for Lagos/Abuja.

Example shipping zone structure:

```json
{
  "id": 1,
  "state": "Lagos",
  "lgas": ["Ikeja", "Surulere"],
  "rate": 3000,
  "freeShippingThreshold": 400000
}
```

## File Organization Conventions

### HTML Pages

- **index.html** - Homepage with promo banner (data/promos.json), category carousel
- **shop.html** - Product grid with filtering/sorting
- **product-details.html** - Single product view with image gallery, specs, reviews
- **cart.html** - Shopping cart with coupon system (`SAVE10`, `SAVE20K`, `FREESHIP`)
- **checkout.html** - Multi-step form with Google Maps autocomplete

### JavaScript Modules

Each `.js` file is independent (no bundler):

- **cart-dropdown.js** - IIFE exposing `window.EgoTechCartDropdown` for global access
- **cart.js** - `ShoppingCart` class managing cart page logic
- **checkout.js** - Functional approach with async data loading
- **main.js** - Homepage-specific: promo loading, category carousel, intersection observers
- **address-autocomplete.js** - Google Places API integration (requires API key setup)

### Shared Utilities Pattern

Common functions like `formatCurrency()`, `getCartItems()`, `saveCartItems()` are **duplicated across files** (no shared module). When updating currency formatting or cart access, check all files that use these patterns.

## Key Developer Workflows

### Adding Products

1. Edit [data/product.json](data/product.json) following existing schema:
   - Required: `id`, `name`, `price`, `currency`, `image`, `category`, `stock`
   - Optional: `featured`, `newArrival`, `specifications`, `reviews[]`
2. Add product images to `assets/images/products/`
3. No rebuild needed - changes appear on page refresh

### Shipping Zone Configuration

Zones in [data/shipping-zones.json](data/shipping-zones.json) are matched hierarchically:

1. Exact LGA match (Lagos/Abuja)
2. State match (other states)
3. Country fallback

When adding zones, maintain specificity order. Checkout calculates shipping by calling `findMatchingShippingZone(location)`.

### Google Maps Integration

Setup documented in [GOOGLE_MAPS_SETUP.md](GOOGLE_MAPS_SETUP.md):

1. Obtain Google Places API key
2. Add to [js/address-autocomplete.js](js/address-autocomplete.js)
3. Form auto-fills: address, city, state, country, lat/lng
4. LGA selection remains manual (Google doesn't provide Nigerian LGAs)

### Currency Display

All prices are stored as integers in Naira (NGN). Format using:

```javascript
new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
}).format(amount);
```

## Critical Implementation Details

### Cart Synchronization

Cart modifications must propagate across:

1. localStorage (`egotec_cart_items`)
2. Dropdown badge (`#cart-count`)
3. Cart page table
4. Checkout summary

Use `saveCart()` in cart.js or `saveCartItems()` in cart-dropdown.js - they trigger UI updates.

### Coupon System

Valid coupons hardcoded in [cart.js](js/cart.js):

```javascript
SAVE10: { type: "percentage", value: 10 }
SAVE20K: { type: "fixed", value: 20000 }
FREESHIP: { type: "freeship", value: 0 }
```

Applied in `applyCoupon()` method which recalculates totals and shipping.

### LGA/Town Learning System

[checkout.js](js/checkout.js) stores user-entered town→LGA mappings in localStorage. When user selects LGA "Ikeja" and enters town "Magodo", save:

```javascript
addTownToLGA("Ikeja", "Magodo");
```

This enables future autocomplete of LGA when user types "Magodo".

### Nigerian States Data

Third-party package at [nigerian-local-government-areas/](nigerian-local-government-areas/) provides JSON/CSV/YAML of all states/LGAs. Access via:

```javascript
fetch("nigerian-local-government-areas/states/Lagos.json");
```

## Testing & Debugging

### Local Development

Open HTML files directly in browser (no server required) OR:

```bash
python3 -m http.server 8000
```

### Console Debugging

- Cart operations log to console: `"Cart loaded from localStorage"`
- Shipping calculations: Check `console.log` in `calculateShippingPreview()`
- Check localStorage in DevTools → Application → Local Storage

### Common Issues

1. **Cart not updating**: Verify localStorage key is `egotec_cart_items` (not `egotech_cart_items`)
2. **Shipping shows ₦0**: Location not selected or zone not matched
3. **LGA dropdown empty**: State not Lagos/Abuja OR JSON fetch failed

## External Dependencies

- **Bootstrap 5.x** - Local copy in [css/bootstrap.min.css](css/bootstrap.min.css)
- **Font Awesome 6.x** - Local copy in [css/fontawesome/](css/fontawesome/)
- **Google Places API** - Requires setup (see [GOOGLE_MAPS_SETUP.md](GOOGLE_MAPS_SETUP.md))

No npm/package.json - all dependencies are committed to repo.

## Project-Specific Conventions

- **Currency**: Always NGN (Naira), stored as integers
- **Image Paths**: Relative from HTML root (`assets/images/products/`)
- **Zone Identifiers**: Use `:Zone.Identifier` suffix on some image files (Windows artifact, safe to ignore)
- **Component Includes**: [components/navbar.html](components/navbar.html) and [components/footer.html](components/footer.html) are standalone (not dynamically loaded)
- **Class Naming**: `egotec-` prefix for all custom CSS classes
- **File Naming**: Use kebab-case for HTML/CSS/JS files

## When Modifying This Codebase

1. **No build step** - Changes are immediately visible on refresh
2. **Check all localStorage keys** - Typos cause state loss
3. **Test multi-currency handling** - Product JSON supports currency field but UI assumes NGN
4. **Validate zone matching logic** - Hierarchy matters (LGA > State > Country)
5. **Update learned towns** - New LGA mappings persist in localStorage, not JSON
