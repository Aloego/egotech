// ============================================
// CART COUNTER FUNCTIONALITY
// ============================================
// This script manages the cart counter badge
// and updates it when items are added to cart

(function () {
  "use strict";

  // Configuration
  const CART_COUNT_KEY = "cartCount"; // localStorage key
  const CART_BADGE_ID = "cart-count"; // ID of the cart counter element
  const ADD_TO_CART_SELECTOR = ".egotec-btn-add-cart"; // Selector for add to cart buttons

  /**
   * Get current cart count from localStorage
   * @returns {number} Current cart count
   */
  function getCartCount() {
    const count = localStorage.getItem(CART_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Save cart count to localStorage
   * @param {number} count - New cart count
   */
  function saveCartCount(count) {
    localStorage.setItem(CART_COUNT_KEY, count.toString());
  }

  /**
   * Update the cart counter badge in the UI
   * @param {number} count - New cart count to display
   */
  function updateCartBadge(count) {
    const badge = document.getElementById(CART_BADGE_ID);
    if (badge) {
      badge.textContent = count;

      // Add animation effect
      badge.style.transform = "scale(1.3)";
      setTimeout(() => {
        badge.style.transform = "scale(1)";
      }, 200);
    }
  }

  /**
   * Increment cart count by 1
   * Updates both localStorage and UI
   */
  function incrementCartCount() {
    const currentCount = getCartCount();
    const newCount = currentCount + 1;
    saveCartCount(newCount);
    updateCartBadge(newCount);
  }

  /**
   * Initialize cart counter on page load
   * Reads from localStorage and displays current count
   */
  function initializeCartCounter() {
    const currentCount = getCartCount();
    updateCartBadge(currentCount);
    console.log("Cart counter initialized:", currentCount);
  }

  /**
   * Attach click event listeners to all "Add to Cart" buttons
   * Uses event delegation for dynamically added buttons
   */
  function attachAddToCartListeners() {
    // Use event delegation on document to handle dynamically added buttons
    document.addEventListener("click", function (event) {
      // Check if clicked element or its parent is an add to cart button
      const addToCartBtn = event.target.closest(ADD_TO_CART_SELECTOR);

      if (addToCartBtn) {
        // Get product ID if available
        const productId = addToCartBtn.getAttribute("data-product-id");

        console.log(
          "Add to cart clicked",
          productId ? `for product ${productId}` : ""
        );

        // Increment cart counter
        incrementCartCount();

        // Optional: Show visual feedback
        showAddToCartFeedback(addToCartBtn);
      }
    });

    console.log("Add to cart listeners attached");
  }

  /**
   * Show visual feedback when item is added to cart
   * @param {HTMLElement} button - The clicked button
   */
  function showAddToCartFeedback(button) {
    const originalHTML = button.innerHTML;
    const originalBg = button.style.backgroundColor;

    // Change button text temporarily
    button.innerHTML = '<i class="fas fa-check"></i> Added!';
    button.style.backgroundColor = "#28a745";
    button.disabled = true;

    // Reset after 1.5 seconds
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.backgroundColor = originalBg;
      button.disabled = false;
    }, 1500);
  }

  /**
   * Initialize everything when DOM is ready
   */
  function init() {
    // Initialize cart counter display
    initializeCartCounter();

    // Attach event listeners to add to cart buttons
    attachAddToCartListeners();

    // Listen for custom events from other scripts
    // In case other parts of the site want to update the cart count
    window.addEventListener("cartUpdated", function (event) {
      const count = event.detail?.count ?? getCartCount();
      updateCartBadge(count);
    });

    // Expose functions globally for other scripts to use
    window.EgoTechCart = {
      getCount: getCartCount,
      updateCount: function (count) {
        saveCartCount(count);
        updateCartBadge(count);
      },
      increment: incrementCartCount,
      decrement: function () {
        const currentCount = getCartCount();
        if (currentCount > 0) {
          const newCount = currentCount - 1;
          saveCartCount(newCount);
          updateCartBadge(newCount);
        }
      },
      reset: function () {
        saveCartCount(0);
        updateCartBadge(0);
      },
    };
  }

  // Run initialization when DOM is fully loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    // DOM already loaded
    init();
  }
})();
