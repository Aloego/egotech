// ============================================
// CART DROPDOWN FUNCTIONALITY
// ============================================
// Manages cart dropdown display and interactions

(function () {
  "use strict";

  const CART_ITEMS_KEY = "egotec_cart_items";

  /**
   * Get cart items from localStorage
   * @returns {Array} Array of cart items
   */
  function getCartItems() {
    const items = localStorage.getItem(CART_ITEMS_KEY);
    return items ? JSON.parse(items) : [];
  }

  /**
   * Save cart items to localStorage
   * @param {Array} items - Cart items array
   */
  function saveCartItems(items) {
    localStorage.setItem(CART_ITEMS_KEY, JSON.stringify(items));
  }

  /**
   * Add item to cart
   * @param {Object} product - Product object
   */
  function addToCart(product) {
    const cartItems = getCartItems();

    // Check if item already exists in cart
    const existingIndex = cartItems.findIndex((item) => item.id === product.id);

    if (existingIndex !== -1) {
      // Increment quantity if exists
      cartItems[existingIndex].qty++;
    } else {
      // Add new item with qty 1
      cartItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        currency: product.currency || "NGN",
        qty: 1,
      });
    }

    saveCartItems(cartItems);
    renderCartDropdown();
    updateCartCount();
  }

  /**
   * Remove item from cart
   * @param {number} productId - Product ID to remove
   */
  function removeFromCart(productId) {
    let cartItems = getCartItems();
    cartItems = cartItems.filter((item) => item.id !== productId);
    saveCartItems(cartItems);
    renderCartDropdown();
    updateCartCount();
  }

  /**
   * Format currency
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency string
   */
  function formatCurrency(amount, currency = "NGN") {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Calculate cart subtotal
   * @returns {number} Subtotal amount
   */
  function calculateSubtotal() {
    const cartItems = getCartItems();
    return cartItems.reduce((total, item) => total + item.price * item.qty, 0);
  }

  /**
   * Update cart count badge
   */
  function updateCartCount() {
    const cartItems = getCartItems();
    const totalQty = cartItems.reduce((total, item) => total + item.qty, 0);

    const badge = document.getElementById("cart-count");
    const itemsCount = document.getElementById("cartItemsCount");

    if (badge) {
      badge.textContent = totalQty;

      // Add animation
      badge.style.transform = "scale(1.3)";
      setTimeout(() => {
        badge.style.transform = "scale(1)";
      }, 200);
    }

    if (itemsCount) {
      itemsCount.textContent = `${totalQty} item${totalQty !== 1 ? "s" : ""}`;
    }
  }

  /**
   * Render cart dropdown content
   */
  function renderCartDropdown() {
    const cartItems = getCartItems();
    const dropdownBody = document.getElementById("cartDropdownBody");
    const emptyMessage = document.getElementById("cartEmptyMessage");
    const dropdownFooter = document.getElementById("cartDropdownFooter");
    const subtotalEl = document.getElementById("cartDropdownSubtotal");

    if (!dropdownBody) return;

    if (cartItems.length === 0) {
      // Show empty message
      if (emptyMessage) emptyMessage.style.display = "block";
      if (dropdownFooter) dropdownFooter.style.display = "none";

      // Clear any existing items
      const existingItems = dropdownBody.querySelectorAll(
        ".egotec-cart-dropdown-item"
      );
      existingItems.forEach((item) => item.remove());
    } else {
      // Hide empty message
      if (emptyMessage) emptyMessage.style.display = "none";
      if (dropdownFooter) dropdownFooter.style.display = "block";

      // Clear existing items
      const existingItems = dropdownBody.querySelectorAll(
        ".egotec-cart-dropdown-item"
      );
      existingItems.forEach((item) => item.remove());

      // Render each cart item with numbering
      cartItems.forEach((item, index) => {
        const itemEl = createCartDropdownItem(item, index + 1);
        dropdownBody.appendChild(itemEl);
      });

      // Update subtotal
      const subtotal = calculateSubtotal();
      if (subtotalEl) {
        subtotalEl.textContent = formatCurrency(
          subtotal,
          cartItems[0]?.currency
        );
      }
    }

    updateCartCount();
  }

  /**
   * Create cart dropdown item element
   * @param {Object} item - Cart item
   * @param {number} itemNumber - Item number in cart
   * @returns {HTMLElement} Cart item element
   */
  function createCartDropdownItem(item, itemNumber) {
    const div = document.createElement("div");
    div.className = "egotec-cart-dropdown-item";
    div.dataset.productId = item.id;

    const itemTotal = item.price * item.qty;

    div.innerHTML = `
      <div class="egotec-cart-item-number">${itemNumber}</div>
      <div class="egotec-cart-item-image">
        <img src="${item.image}" alt="${item.name}" 
             onerror="this.src='https://via.placeholder.com/60x60?text=Product'">
      </div>
      <div class="egotec-cart-item-details">
        <h6 class="egotec-cart-item-name">${item.name}</h6>
        <div class="egotec-cart-item-info">
          <span class="egotec-cart-item-qty">${item.qty} × ${formatCurrency(
      item.price,
      item.currency
    )}</span>
          <span class="egotec-cart-item-price">${formatCurrency(
            itemTotal,
            item.currency
          )}</span>
        </div>
      </div>
      <button class="egotec-cart-item-remove" data-product-id="${
        item.id
      }" title="Remove">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Attach remove event
    const removeBtn = div.querySelector(".egotec-cart-item-remove");
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      removeFromCart(item.id);
    });

    return div;
  }

  /**
   * Handle add to cart button clicks
   */
  function attachAddToCartListeners() {
    document.addEventListener("click", async function (e) {
      // Support multiple button class names
      const addToCartBtn = e.target.closest(
        ".egotec-btn-add-cart, .egotec-add-to-cart-btn, #qvAddToCart"
      );

      if (addToCartBtn) {
        e.preventDefault();
        e.stopPropagation();

        const productId = addToCartBtn.getAttribute("data-product-id");

        if (productId) {
          // Fetch product data
          try {
            const response = await fetch("data/product.json");
            const data = await response.json();
            const products = data.products || data;

            const product = products.find(
              (p) => Number(p.id) === Number(productId)
            );

            if (product) {
              // Get quantity from quick view modal OR product details page
              const qvQtyInput = document.getElementById("qvQuantity");
              const pdQtyInput = document.getElementById("productQuantity");
              const quantity = qvQtyInput
                ? parseInt(qvQtyInput.value) || 1
                : pdQtyInput
                ? parseInt(pdQtyInput.value) || 1
                : 1;

              // Add multiple quantities if needed
              for (let i = 0; i < quantity; i++) {
                addToCart(product);
              }

              showAddToCartFeedback(addToCartBtn);
            }
          } catch (error) {
            console.error("Error adding to cart:", error);
          }
        }
      }
    });
  }

  /**
   * Show visual feedback when item is added
   * @param {HTMLElement} button - Clicked button
   */
  function showAddToCartFeedback(button) {
    const originalHTML = button.innerHTML;
    const originalBg = button.style.backgroundColor;

    button.innerHTML = '<i class="fas fa-check"></i> Added!';
    button.style.backgroundColor = "#28a745";
    button.disabled = true;

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.backgroundColor = originalBg;
      button.disabled = false;
    }, 1500);
  }

  /**
   * Initialize cart dropdown
   */
  function init() {
    // Render initial cart state
    renderCartDropdown();

    // Attach event listeners
    attachAddToCartListeners();

    // Expose API
    window.EgoTechCartDropdown = {
      addToCart,
      removeFromCart,
      getCartItems,
      renderCartDropdown,
      updateCartCount,
    };
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
