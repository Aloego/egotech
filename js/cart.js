// Cart Page JavaScript

class ShoppingCart {
  constructor() {
    this.cart = [];
    this.shippingCost = 0; // Will be calculated based on location
    this.taxRate = 0; // Will be calculated based on location
    this.discount = 0;
    this.couponApplied = null;
    this.userLocation = null; // Store user location
    this.shippingZones = [];
    this.taxRates = [];
    this.validCoupons = {
      SAVE10: { type: "percentage", value: 10, description: "10% off" },
      SAVE20K: { type: "fixed", value: 20000, description: "₦20,000 off" },
      FREESHIP: { type: "freeship", value: 0, description: "Free shipping" },
    };

    this.init();
  }

  async init() {
    // Load shipping zones and tax rates
    await this.loadShippingZones();
    await this.loadTaxRates();

    // Load user location from localStorage
    this.loadUserLocation();

    // Load cart from localStorage or fetch from JSON
    this.loadCart();

    // Render cart
    this.renderCart();

    // Attach event listeners
    this.attachEventListeners();

    // Update cart badge
    this.updateCartBadge();
  }

  loadCart() {
    // Try to load from localStorage first (use same key as cart-dropdown.js)
    const savedCart = localStorage.getItem("egotec_cart_items");

    if (savedCart) {
      this.cart = JSON.parse(savedCart);
      console.log("Cart loaded from localStorage:", this.cart);
    } else {
      // If no localStorage, load from JSON file
      this.loadCartFromJSON();
    }
  }

  async loadCartFromJSON() {
    try {
      const response = await fetch("data/cart.json");
      if (response.ok) {
        this.cart = await response.json();
        console.log("Cart loaded from JSON:", this.cart);
        this.saveCart(); // Save to localStorage
        this.renderCart();
        this.updateCartBadge();
      }
    } catch (error) {
      console.error("Error loading cart from JSON:", error);
      this.cart = [];
    }
  }

  saveCart() {
    localStorage.setItem("egotec_cart_items", JSON.stringify(this.cart));
    console.log("Cart saved to localStorage");

    // Trigger cart dropdown update if it exists
    if (window.EgoTechCartDropdown) {
      window.EgoTechCartDropdown.renderCartDropdown();
      window.EgoTechCartDropdown.updateCartCount();
    }
  }

  renderCart() {
    const tableBody = document.getElementById("cartTableBody");
    const mobileContainer = document.getElementById("cartMobileContainer");
    const emptyMessage = document.getElementById("emptyCartMessage");
    const cartTableContainer = document.getElementById("cartTableContainer");
    const cartTotals = document.getElementById("cartTotals");

    if (this.cart.length === 0) {
      // Show empty cart message
      emptyMessage.style.display = "block";
      cartTableContainer.style.display = "none";
      cartTotals.style.display = "none";
    } else {
      // Show cart items
      emptyMessage.style.display = "none";
      cartTableContainer.style.display = "block";
      cartTotals.style.display = "block";

      // Clear existing content
      tableBody.innerHTML = "";
      mobileContainer.innerHTML = "";

      // Render each cart item
      this.cart.forEach((item, index) => {
        // Desktop table row
        const row = this.createTableRow(item, index);
        tableBody.appendChild(row);

        // Mobile card
        const mobileCard = this.createMobileCard(item, index);
        mobileContainer.appendChild(mobileCard);
      });

      // Update totals
      this.updateTotals();
    }
  }

  createTableRow(item, index) {
    const row = document.createElement("tr");
    row.dataset.index = index;

    const subtotal = item.price * item.qty;
    const formattedPrice = this.formatCurrency(item.price);
    const formattedSubtotal = this.formatCurrency(subtotal);

    row.innerHTML = `
      <td>
        <div class="egotec-cart-product">
          <div class="egotec-cart-product-image">
            <img src="${item.image}" alt="${item.name}" 
                 onerror="this.src='https://via.placeholder.com/80x80?text=Product'">
          </div>
          <div class="egotec-cart-product-info">
            <h4>${item.name}</h4>
          </div>
        </div>
      </td>
      <td>
        <div class="egotec-cart-price">${formattedPrice}</div>
      </td>
      <td>
        <div class="egotec-qty-selector">
          <button class="egotec-qty-btn egotec-qty-minus" data-index="${index}" ${
      item.qty <= 1 ? "disabled" : ""
    }>
            <i class="fas fa-minus"></i>
          </button>
          <input type="number" class="egotec-qty-value" value="${
            item.qty
          }" min="1" readonly>
          <button class="egotec-qty-btn egotec-qty-plus" data-index="${index}">
            <i class="fas fa-plus"></i>
          </button>
        </div>
      </td>
      <td>
        <div class="egotec-cart-subtotal">${formattedSubtotal}</div>
      </td>
      <td>
        <button class="egotec-cart-delete" data-index="${index}" title="Remove item">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;

    return row;
  }

  createMobileCard(item, index) {
    const card = document.createElement("div");
    card.className = "egotec-cart-mobile-item";
    card.dataset.index = index;

    const subtotal = item.price * item.qty;
    const formattedPrice = this.formatCurrency(item.price);
    const formattedSubtotal = this.formatCurrency(subtotal);

    card.innerHTML = `
      <button class="egotec-cart-mobile-delete" data-index="${index}" title="Remove item">
        <i class="fas fa-times"></i>
      </button>
      <div class="egotec-cart-mobile-product">
        <div class="egotec-cart-mobile-image">
          <img src="${item.image}" alt="${item.name}"
               onerror="this.src='https://via.placeholder.com/80x80?text=Product'">
        </div>
        <div class="egotec-cart-mobile-info">
          <h4>${item.name}</h4>
          <div class="egotec-cart-mobile-price">${formattedPrice}</div>
        </div>
      </div>
      <div class="egotec-cart-mobile-controls">
        <div class="egotec-qty-selector">
          <button class="egotec-qty-btn egotec-qty-minus" data-index="${index}" ${
      item.qty <= 1 ? "disabled" : ""
    }>
            <i class="fas fa-minus"></i>
          </button>
          <input type="number" class="egotec-qty-value" value="${
            item.qty
          }" min="1" readonly>
          <button class="egotec-qty-btn egotec-qty-plus" data-index="${index}">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="egotec-cart-mobile-subtotal">${formattedSubtotal}</div>
      </div>
    `;

    return card;
  }

  attachEventListeners() {
    // Delegate events to handle dynamically created elements
    document.addEventListener("click", (e) => {
      // Quantity increase
      if (e.target.closest(".egotec-qty-plus")) {
        const btn = e.target.closest(".egotec-qty-plus");
        const index = parseInt(btn.dataset.index);
        this.increaseQuantity(index);
      }

      // Quantity decrease
      if (e.target.closest(".egotec-qty-minus")) {
        const btn = e.target.closest(".egotec-qty-minus");
        const index = parseInt(btn.dataset.index);
        this.decreaseQuantity(index);
      }

      // Delete item
      if (
        e.target.closest(".egotec-cart-delete") ||
        e.target.closest(".egotec-cart-mobile-delete")
      ) {
        const btn =
          e.target.closest(".egotec-cart-delete") ||
          e.target.closest(".egotec-cart-mobile-delete");
        const index = parseInt(btn.dataset.index);
        this.removeItem(index);
      }
    });

    // Apply coupon button
    document.getElementById("applyCouponBtn").addEventListener("click", () => {
      this.applyCoupon();
    });

    // Coupon input - apply on Enter
    document.getElementById("couponCode").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.applyCoupon();
      }
    });

    // Checkout button
    document.getElementById("checkoutBtn").addEventListener("click", () => {
      this.proceedToCheckout();
    });
  }

  increaseQuantity(index) {
    if (this.cart[index]) {
      this.cart[index].qty++;
      this.saveCart();
      this.renderCart();
      this.updateCartBadge();
    }
  }

  decreaseQuantity(index) {
    if (this.cart[index] && this.cart[index].qty > 1) {
      this.cart[index].qty--;
      this.saveCart();
      this.renderCart();
      this.updateCartBadge();
    }
  }

  removeItem(index) {
    if (confirm("Are you sure you want to remove this item from your cart?")) {
      this.cart.splice(index, 1);
      this.saveCart();
      this.renderCart();
      this.updateCartBadge();

      // Show notification
      this.showNotification("Item removed from cart", "success");
    }
  }

  applyCoupon() {
    const couponInput = document.getElementById("couponCode");
    const couponCode = couponInput.value.trim().toUpperCase();
    const couponMessage = document.getElementById("couponMessage");

    if (!couponCode) {
      this.showCouponMessage("Please enter a coupon code", "error");
      return;
    }

    if (this.validCoupons[couponCode]) {
      this.couponApplied = couponCode;
      const coupon = this.validCoupons[couponCode];
      this.showCouponMessage(
        `Coupon applied! ${coupon.description}`,
        "success"
      );
      couponInput.value = "";
      this.updateTotals();
    } else {
      this.showCouponMessage("Invalid coupon code", "error");
    }
  }

  showCouponMessage(message, type) {
    const couponMessage = document.getElementById("couponMessage");
    couponMessage.textContent = message;
    couponMessage.className = `egotec-coupon-message ${type}`;
  }

  calculateSubtotal() {
    return this.cart.reduce((total, item) => total + item.price * item.qty, 0);
  }

  calculateDiscount(subtotal) {
    if (!this.couponApplied) return 0;

    const coupon = this.validCoupons[this.couponApplied];

    if (coupon.type === "percentage") {
      return (subtotal * coupon.value) / 100;
    } else if (coupon.type === "fixed") {
      return coupon.value;
    }

    return 0;
  }

  calculateShipping() {
    if (this.couponApplied === "FREESHIP") {
      return 0;
    }
    return this.shippingCost;
  }

  calculateTax(subtotal, discount) {
    const taxableAmount = subtotal - discount;
    return taxableAmount * this.taxRate;
  }

  updateTotals() {
    const subtotal = this.calculateSubtotal();
    const discount = this.calculateDiscount(subtotal);
    const shipping = this.calculateShipping();
    const tax = this.calculateTax(subtotal, discount);
    const total = subtotal - discount + shipping + tax;

    // Update UI
    document.getElementById("cartSubtotal").textContent =
      this.formatCurrency(subtotal);

    // Show shipping cost or TBD message
    const shippingElement = document.getElementById("cartShipping");
    // Only show shipping if userLocation is set and has required fields
    if (
      this.userLocation &&
      this.userLocation.state &&
      this.userLocation.address
    ) {
      if (this.freeShippingApplied) {
        shippingElement.innerHTML = `<span style="color: #28a745; font-weight: 600;">Free Shipping!</span>`;
      } else {
        shippingElement.textContent = this.formatCurrency(shipping);
      }
      // Show shipping zone info if available
      if (this.shippingZoneName) {
        const shippingRow = shippingElement.closest(".egotec-totals-row");
        if (shippingRow && !shippingRow.querySelector(".shipping-info")) {
          const info = document.createElement("small");
          info.className = "shipping-info d-block text-muted";
          info.textContent = `${this.shippingZoneName} (${this.estimatedDelivery} days)`;
          shippingRow.appendChild(info);
        }
      }
    } else {
      shippingElement.innerHTML = `<span style=\"color: #666; font-style: italic;\">TBD on checkout</span>`;
    }

    // Show tax as 7.5%
    const taxElement = document.getElementById("cartTax");
    taxElement.textContent = "7.5%";

    document.getElementById("cartTotal").textContent =
      this.formatCurrency(total);

    // Show/hide discount row
    const discountRow = document.getElementById("discountRow");
    if (discount > 0) {
      discountRow.style.display = "flex";
      document.getElementById("cartDiscount").textContent =
        "- " + this.formatCurrency(discount);
    } else {
      discountRow.style.display = "none";
    }
  }

  updateCartBadge() {
    const badge = document.getElementById("cartBadge");
    const totalItems = this.cart.reduce((total, item) => total + item.qty, 0);
    if (badge) {
      badge.textContent = totalItems;
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  proceedToCheckout() {
    if (this.cart.length === 0) {
      alert("Your cart is empty. Please add items before checking out.");
      return;
    }

    // Save cart data for checkout page
    const checkoutData = {
      items: this.cart,
      subtotal: this.calculateSubtotal(),
      discount: this.calculateDiscount(this.calculateSubtotal()),
      shipping: this.calculateShipping(),
      tax: this.calculateTax(
        this.calculateSubtotal(),
        this.calculateDiscount(this.calculateSubtotal())
      ),
      total:
        this.calculateSubtotal() -
        this.calculateDiscount(this.calculateSubtotal()) +
        this.calculateShipping() +
        this.calculateTax(
          this.calculateSubtotal(),
          this.calculateDiscount(this.calculateSubtotal())
        ),
      coupon: this.couponApplied,
    };

    localStorage.setItem("egotech_checkout", JSON.stringify(checkoutData));

    // Redirect to checkout page
    window.location.href = "checkout.html";
  }

  showNotification(message, type = "success") {
    // Simple notification - you can enhance this with a toast library
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${type === "success" ? "#10b981" : "#ef4444"};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // ============================================
  // LOCATION-BASED SHIPPING AND TAX
  // ============================================

  /**
   * Load shipping zones from JSON
   */
  async loadShippingZones() {
    try {
      const response = await fetch("data/shipping-zones.json");
      if (response.ok) {
        const data = await response.json();
        this.shippingZones = data.shippingZones || [];
        this.defaultZone = data.defaultZone;
        console.log("Shipping zones loaded:", this.shippingZones.length);
      }
    } catch (error) {
      console.error("Error loading shipping zones:", error);
      this.shippingZones = [];
      this.defaultZone = {
        rate: 5000,
        estimatedDays: "3-7",
        freeShippingThreshold: 100000,
      };
    }
  }

  /**
   * Load tax rates from JSON
   */
  async loadTaxRates() {
    try {
      const response = await fetch("data/tax-rates.json");
      if (response.ok) {
        const data = await response.json();
        this.taxRates = data.taxRates || [];
        this.defaultTaxRate = data.defaultTaxRate;
        console.log("Tax rates loaded:", this.taxRates.length);
      }
    } catch (error) {
      console.error("Error loading tax rates:", error);
      this.taxRates = [];
      this.defaultTaxRate = { rate: 7.5, type: "percentage" };
    }
  }

  /**
   * Load user location from localStorage
   */
  loadUserLocation() {
    const savedLocation = localStorage.getItem("egotech_user_location");
    if (savedLocation) {
      try {
        this.userLocation = JSON.parse(savedLocation);
        console.log(
          "User location loaded from localStorage:",
          this.userLocation
        );

        // Calculate shipping and tax based on saved location
        this.calculateLocationBasedRates();
      } catch (error) {
        console.error("Error parsing saved location:", error);
        this.userLocation = null;
      }
    } else {
      console.log(
        "No saved location found - rates will be calculated on checkout"
      );
      this.userLocation = null;
    }
  }

  /**
   * Calculate shipping and tax rates based on user location
   */
  calculateLocationBasedRates() {
    if (!this.userLocation) {
      // No location saved - set to 0 (will be calculated on checkout)
      this.shippingCost = 0;
      this.taxRate = 0;
      return;
    }

    // Find matching shipping zone
    const zone = this.findMatchingShippingZone(this.userLocation);
    if (zone) {
      const subtotal = this.calculateSubtotal();

      // Check free shipping threshold
      if (
        zone.freeShippingThreshold &&
        subtotal >= zone.freeShippingThreshold
      ) {
        this.shippingCost = 0;
        this.freeShippingApplied = true;
        console.log(
          "Free shipping applied! Subtotal:",
          subtotal,
          "Threshold:",
          zone.freeShippingThreshold
        );
      } else {
        this.shippingCost = zone.rate;
        this.freeShippingApplied = false;
      }

      this.shippingZoneName = zone.name;
      this.estimatedDelivery = zone.estimatedDays;
    } else {
      // Use default zone
      this.shippingCost = this.defaultZone?.rate || 5000;
      this.shippingZoneName = this.defaultZone?.name || "Default Shipping";
      this.estimatedDelivery = this.defaultZone?.estimatedDays || "3-7";
    }

    // Set tax to zero (to be determined in future)
    this.taxRate = 0;

    console.log(
      "Rates calculated - Shipping:",
      this.shippingCost,
      "Tax:",
      this.taxRate * 100 + "%"
    );
  }

  /**
   * Find matching shipping zone based on location
   * Priority: Country + State + LGA > Country + State > Country > Default
   */
  findMatchingShippingZone(location) {
    const { country, state, lga } = location;

    // Priority 1: Match Country + State + LGA
    if (country && state && lga) {
      const lgaMatch = this.shippingZones.find(
        (zone) =>
          zone.country === country &&
          zone.state === state &&
          zone.lgas &&
          zone.lgas.includes(lga)
      );
      if (lgaMatch) {
        console.log("Matched zone by LGA:", lgaMatch.name);
        return lgaMatch;
      }
    }

    // Priority 2: Match Country + State
    if (country && state) {
      const stateMatch = this.shippingZones.find(
        (zone) => zone.country === country && zone.state === state && !zone.lgas // Zone without specific LGAs
      );
      if (stateMatch) {
        console.log("Matched zone by State:", stateMatch.name);
        return stateMatch;
      }

      // Also check zones with multiple states
      const multiStateMatch = this.shippingZones.find(
        (zone) =>
          zone.country === country && zone.states && zone.states.includes(state)
      );
      if (multiStateMatch) {
        console.log(
          "Matched zone by State (multi-state zone):",
          multiStateMatch.name
        );
        return multiStateMatch;
      }
    }

    // Priority 3: Match Country only
    if (country) {
      const countryMatch = this.shippingZones.find(
        (zone) => zone.country === country && !zone.state && !zone.states
      );
      if (countryMatch) {
        console.log("Matched zone by Country:", countryMatch.name);
        return countryMatch;
      }
    }

    console.log("No matching zone found, using default");
    return null;
  }

  /**
   * Find matching tax rate based on location
   */
  findMatchingTaxRate(location) {
    const { country, state } = location;

    // Priority 1: Match Country + State
    if (country && state) {
      const stateMatch = this.taxRates.find(
        (rate) => rate.country === country && rate.state === state
      );
      if (stateMatch) {
        console.log("Matched tax rate by State:", stateMatch.name);
        return stateMatch;
      }
    }

    // Priority 2: Match Country only
    if (country) {
      const countryMatch = this.taxRates.find(
        (rate) =>
          rate.country === country && !rate.state && rate.default === true
      );
      if (countryMatch) {
        console.log("Matched tax rate by Country:", countryMatch.name);
        return countryMatch;
      }
    }

    console.log("No matching tax rate found, using default");
    return null;
  }
}

// Initialize cart when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new ShoppingCart();
});

// Add CSS for animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
