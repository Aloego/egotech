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

};