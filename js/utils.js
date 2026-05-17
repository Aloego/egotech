// // ============================================
// // EGOTECH SHARED UTILITIES
// // ============================================
// // This file contains shared utility functions
// // used across multiple pages. Load it before
// // any other EgoTech JS file.
// // ============================================

// const EgoTechUtils = {

//   // Cart localStorage key
//   CART_ITEMS_KEY: "egotec_cart_items",

//   // Format amount as Nigerian Naira
//   formatCurrency(amount) {
//     return new Intl.NumberFormat("en-NG", {
//       style: "currency",
//       currency: "NGN",
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(amount);
//   },

//   // Get cart items from localStorage
//   getCartItems() {
//     try {
//       const items = localStorage.getItem(this.CART_ITEMS_KEY);
//       return items ? JSON.parse(items) : [];
//     } catch (e) {
//       console.error("Error reading cart items:", e);
//       return [];
//     }
//   },

//   // Save cart items to localStorage
//   saveCartItems(items) {
//     try {
//       localStorage.setItem(this.CART_ITEMS_KEY, JSON.stringify(items));
//     } catch (e) {
//       console.error("Error saving cart items:", e);
//     }
//   },

//   // Fetch products from backend with fallback to product.json
//   async fetchProducts() {
//     try {
//       // Try backend first
//       const response = await fetch("https://egotech.onrender.com/api/products");
//       if (!response.ok) throw new Error("Backend fetch failed");
//       const data = await response.json();

//      async fetchProducts() {
//   try {
//     const response = await fetch("https://egotech.onrender.com/api/products");
//     if (!response.ok) throw new Error("Backend fetch failed");
//     const data = await response.json();

//     console.log("Products loaded from backend:", data.products.length);
//     return data.products;

//   } catch (err) {
//     console.warn("Backend unavailable, falling back to product.json:", err.message);
//     const response = await fetch("data/product.json");
//     if (!response.ok) throw new Error("Failed to load product.json");
//     const data = await response.json();
//     console.log("Products loaded from product.json:", data.products.length);
//     return data.products;
//   }
// },
  
//       console.log("Products loaded from backend:", data.products.length);
//       return data.products;

//     } catch (err) {
//       console.warn("Backend unavailable, falling back to product.json:", err.message);

//       // Fallback to product.json
//       const response = await fetch("data/product.json");
//       if (!response.ok) throw new Error("Failed to load product.json");
//       const data = await response.json();
//       console.log("Products loaded from product.json:", data.products.length);
//       return data.products;
//     }
//   },

// };


// ============================================
// EGOTECH SHARED UTILITIES
// ============================================
// This file contains shared utility functions
// used across multiple pages. Load it before
// any other EgoTech JS file.
// ============================================

const EgoTechUtils = {

  // Cart localStorage key
  CART_ITEMS_KEY: "egotec_cart_items",

  // Format amount as Nigerian Naira
  formatCurrency(amount) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  // Get cart items from localStorage
  getCartItems() {
    try {
      const items = localStorage.getItem(this.CART_ITEMS_KEY);
      return items ? JSON.parse(items) : [];
    } catch (e) {
      console.error("Error reading cart items:", e);
      return [];
    }
  },

  // Save cart items to localStorage
  saveCartItems(items) {
    try {
      localStorage.setItem(this.CART_ITEMS_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Error saving cart items:", e);
    }
  },

  // Fetch products from backend with fallback to product.json
  async fetchProducts() {
    try {
      const response = await fetch("https://egotech.onrender.com/api/products");
      if (!response.ok) throw new Error("Backend fetch failed");
      const data = await response.json();

      // If backend returns products use them
      // Otherwise fall back to product.json
      if (data.products && data.products.length > 0) {
        console.log("Products loaded from backend:", data.products.length);
        return data.products;
      }

      throw new Error("No approved products on backend yet");

    } catch (err) {
      console.warn("Falling back to product.json:", err.message);
      const response = await fetch("data/product.json");
      if (!response.ok) throw new Error("Failed to load product.json");
      const data = await response.json();
      console.log("Products loaded from product.json:", data.products.length);
      return data.products;
    }
  },

};