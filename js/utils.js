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

  // Generate condition badge HTML
   getConditionBadge(condition) {
  if (!condition) return "";
  const classes = {
    "NEW": "egotec-condition-new",
    "USED": "egotec-condition-used",
    "REFURBISHED": "egotec-condition-refurbished"
  };
  const cls = classes[condition.toUpperCase()] || "";
  if (!cls) return "";

  const notices = {
    "USED": `<small class="egotec-condition-notice">
      <i class="fas fa-info-circle me-1"></i>
      This is a used product. May have minor scratches or dents, 
      battery may not be fully optimal, and comes without warranty.
    </small>`,
    "REFURBISHED": `<small class="egotec-condition-notice">
      <i class="fas fa-info-circle me-1"></i>
      This is a refurbished product. Professionally restored to working 
      condition. May have minor cosmetic imperfections and comes without 
      original warranty.
    </small>`
  };

  const notice = notices[condition.toUpperCase()] || "";

  return `
    <span class="egotec-condition-badge ${cls}">${condition}</span>
    ${notice}
  `;
},

  // Fetch products from backend with fallback to product.json
  async fetchProducts() {
    try {
      // Fetch from both sources simultaneously
      const [backendResult, jsonResult] = await Promise.allSettled([
        fetch("https://egotech.onrender.com/api/products")
          .then(res => res.ok ? res.json() : Promise.reject("Backend failed"))
          .then(data => data.products || []),
        fetch("data/product.json")
          .then(res => res.ok ? res.json() : Promise.reject("JSON failed"))
          .then(data => data.products || [])
      ]);

      const backendProducts = backendResult.status === "fulfilled" 
        ? backendResult.value : [];
      const jsonProducts = jsonResult.status === "fulfilled" 
        ? jsonResult.value : [];

      console.log("Backend products:", backendProducts.length);
      console.log("JSON products:", jsonProducts.length);

      // Combine both sources — backend products take priority
      // Remove duplicates by checking product name and category
      const combinedProducts = [...backendProducts];

      jsonProducts.forEach(jsonProduct => {
        const isDuplicate = backendProducts.some(
          bp => bp.name.toLowerCase() === jsonProduct.name.toLowerCase() &&
                bp.category.toLowerCase() === jsonProduct.category.toLowerCase()
        );
        if (!isDuplicate) {
          combinedProducts.push(jsonProduct);
        }
      });

      console.log("Combined products:", combinedProducts.length);
      return combinedProducts;

    } catch (err) {
      console.error("Error fetching products:", err);
      // Last resort fallback
      const response = await fetch("data/product.json");
      const data = await response.json();
      return data.products || [];
    }
  },

};