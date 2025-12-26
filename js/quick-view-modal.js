// Ensure quick view modal add-to-cart button resets on open
document.addEventListener("DOMContentLoaded", function () {
  const qvModal = document.getElementById("quickViewModal");
  if (qvModal) {
    qvModal.addEventListener("show.bs.modal", function () {
      const addBtn = document.getElementById("qvAddToCart");
      if (addBtn) {
        addBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
        addBtn.style.backgroundColor = "";
        addBtn.disabled = false;
      }
    });
  }
});
// Quick View Modal JavaScript

class QuickViewModal {
  constructor() {
    this.overlay = null;
    this.modal = null;
    this.currentProduct = null;
    this.currentImageIndex = 0;
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.init();
  }

  init() {
    // Create modal HTML
    this.createModalHTML();

    // Add event listeners
    this.attachEventListeners();
  }

  createModalHTML() {
    const modalHTML = `
      <div class="egotec-quick-view-overlay" id="quickViewOverlay">
        <div class="egotec-quick-view-modal">
          <button class="egotec-qv-close-btn" id="qvCloseBtn">
            <i class="fas fa-times"></i>
          </button>
          <div class="egotec-qv-modal-body">
            <div class="row">
              <!-- Left Side - Gallery -->
              <div class="col-lg-6 mb-4 mb-lg-0">
                <div class="egotec-qv-gallery">
                  <div class="egotec-qv-main-image-container" id="qvMainImageContainer">
                    <img src="" alt="" class="egotec-qv-main-image" id="qvMainImage">
                    <button class="egotec-qv-arrow egotec-qv-arrow-prev" id="qvArrowPrev">
                      <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="egotec-qv-arrow egotec-qv-arrow-next" id="qvArrowNext">
                      <i class="fas fa-chevron-right"></i>
                    </button>
                  </div>
                  <div class="egotec-qv-thumbnails" id="qvThumbnails"></div>
                </div>
              </div>

              <!-- Right Side - Product Info -->
              <div class="col-lg-6">
                <div class="egotec-qv-product-info">
                  <h2 class="egotec-qv-title" id="qvTitle"></h2>
                  
                  <div class="egotec-qv-rating" id="qvRating"></div>
                  
                  <div class="egotec-qv-stock" id="qvStock"></div>
                  
                  <div class="egotec-qv-price" id="qvPrice"></div>
                  
                  <p class="egotec-qv-description" id="qvDescription"></p>
                  
                  <div class="egotec-qv-quantity-wrapper">
                    <label class="egotec-qv-quantity-label">Quantity:</label>
                    <div class="egotec-qv-quantity-selector">
                      <button class="egotec-qv-qty-btn" id="qvQtyMinus">
                        <i class="fas fa-minus"></i>
                      </button>
                      <input 
                        type="number" 
                        class="egotec-qv-qty-input" 
                        id="qvQuantity" 
                        value="1" 
                        min="1" 
                        readonly
                      >
                      <button class="egotec-qv-qty-btn" id="qvQtyPlus">
                        <i class="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>
                  
                  <div class="egotec-qv-actions">
                    <button class="egotec-qv-btn egotec-qv-btn-primary" id="qvAddToCart">
                      <i class="fas fa-shopping-cart"></i>
                      Add to Cart
                    </button>
                    <button class="egotec-qv-btn egotec-qv-btn-secondary" id="qvBuyNow">
                      <i class="fas fa-bolt"></i>
                      Buy Now
                    </button>
                    <button class="egotec-qv-btn egotec-qv-btn-wishlist" id="qvWishlist">
                      <i class="far fa-heart"></i>
                      Add to Wishlist
                    </button>
                  </div>
                  
                  <div class="egotec-qv-meta" id="qvMeta"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Get references
    this.overlay = document.getElementById("quickViewOverlay");
    this.modal = this.overlay.querySelector(".egotec-quick-view-modal");
  }

  attachEventListeners() {
    // Close button
    document.getElementById("qvCloseBtn").addEventListener("click", () => {
      this.close();
    });

    // Click outside modal
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // ESC key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.overlay.classList.contains("active")) {
        this.close();
      }
    });

    // Gallery arrows
    document.getElementById("qvArrowPrev").addEventListener("click", () => {
      this.previousImage();
    });

    document.getElementById("qvArrowNext").addEventListener("click", () => {
      this.nextImage();
    });

    // Touch swipe for mobile
    const imageContainer = document.getElementById("qvMainImageContainer");
    imageContainer.addEventListener("touchstart", (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
    });

    imageContainer.addEventListener("touchend", (e) => {
      this.touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe();
    });

    // Quantity buttons
    document.getElementById("qvQtyMinus").addEventListener("click", () => {
      this.decreaseQuantity();
    });

    document.getElementById("qvQtyPlus").addEventListener("click", () => {
      this.increaseQuantity();
    });

    // Action buttons
    document.getElementById("qvAddToCart").addEventListener("click", () => {
      this.addToCart();
    });

    document.getElementById("qvBuyNow").addEventListener("click", () => {
      this.buyNow();
    });

    document.getElementById("qvWishlist").addEventListener("click", () => {
      this.toggleWishlist();
    });

    // Attach to all quick view buttons on page
    this.attachToQuickViewButtons();
  }

  attachToQuickViewButtons() {
    // Listen for clicks on quick view buttons/links
    document.addEventListener("click", (e) => {
      const quickViewBtn = e.target.closest(
        ".egotec-btn-quick-view, .egotec-quick-view-link"
      );
      if (quickViewBtn) {
        e.preventDefault();
        const productId = quickViewBtn.getAttribute("data-product-id");
        console.log("Quick View clicked for product ID:", productId);
        if (productId) {
          this.open(productId);
        } else {
          console.error("No product ID found on button");
        }
      }
    });
  }

  async open(productId) {
    console.log("Opening Quick View for product ID:", productId);

    try {
      // Fetch product data - try multiple paths
      let response;
      try {
        response = await fetch("data/product.json");
      } catch (e) {
        console.log("First path failed, trying alternative...");
        response = await fetch("./data/product.json");
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const products = data.products || data; // Handle both {products: [...]} and [...] formats
      console.log("Products loaded:", products.length);

      // Find product by ID (convert both to numbers for comparison)
      const product = products.find((p) => Number(p.id) === Number(productId));

      if (!product) {
        console.error("Product not found with ID:", productId);
        console.log(
          "Available product IDs:",
          products.map((p) => p.id)
        );
        alert(`Product with ID ${productId} not found.`);
        return;
      }

      console.log("Product found:", product.name);

      this.currentProduct = product;
      this.currentImageIndex = 0;

      // Populate modal with product data
      this.populateModal(product);

      // Show modal
      this.overlay.classList.add("active");
      document.body.classList.add("egotec-qv-modal-open");
    } catch (error) {
      console.error("Error loading product:", error);
      console.error("Error stack:", error.stack);
      alert(
        "Failed to load product details. Please try again.\n\nError: " +
          error.message
      );
    }
  }

  close() {
    this.overlay.classList.remove("active");
    document.body.classList.remove("egotec-qv-modal-open");
    this.currentProduct = null;
    // Reset quantity input to 1 when modal closes
    const qtyInput = document.getElementById("qvQuantity");
    if (qtyInput) {
      qtyInput.value = 1;
    }
  }

  populateModal(product) {
    // Reset quantity input to 1 for every product
    const qtyInput = document.getElementById("qvQuantity");
    if (qtyInput) {
      qtyInput.value = 1;
    }
    // Reset Add to Cart button state for every product
    const addBtn = document.getElementById("qvAddToCart");
    if (addBtn) {
      addBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
      addBtn.style.backgroundColor = "";
      addBtn.disabled = false;
    }

    // Title
    document.getElementById("qvTitle").textContent = product.name;

    // Rating
    this.renderRating(product.rating || 0);

    // Stock Status
    this.renderStockStatus(product.stock || 0);

    // Price
    const formattedPrice = new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: product.currency || "NGN",
    }).format(product.price);
    document.getElementById("qvPrice").textContent = formattedPrice;

    // Description
    const description =
      product.description ||
      product.shortDescription ||
      "No description available.";
    document.getElementById("qvDescription").textContent = description;

    // Gallery
    this.renderGallery(product);

    // Meta info
    this.renderMeta(product);

    // Reset quantity
    document.getElementById("qvQuantity").value = 1;

    // Set product ID on add to cart button for cart-dropdown.js
    const addToCartBtn = document.getElementById("qvAddToCart");
    if (addToCartBtn) {
      addToCartBtn.setAttribute("data-product-id", product.id);
    }
  }

  renderRating(rating) {
    const ratingContainer = document.getElementById("qvRating");
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let starsHTML = '<div class="egotec-qv-stars">';
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
      starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<i class="far fa-star"></i>';
    }
    starsHTML += "</div>";
    starsHTML += `<span class="egotec-qv-rating-text">(${rating.toFixed(
      1
    )} / 5)</span>`;

    ratingContainer.innerHTML = starsHTML;
  }

  renderStockStatus(stock) {
    const stockContainer = document.getElementById("qvStock");
    let statusClass = "in-stock";
    let statusText = "In Stock";
    let iconClass = "fas fa-check-circle";

    if (stock === 0) {
      statusClass = "out-of-stock";
      statusText = "Out of Stock";
      iconClass = "fas fa-times-circle";
    } else if (stock <= 5) {
      statusClass = "low-stock";
      statusText = `Only ${stock} left!`;
      iconClass = "fas fa-exclamation-circle";
    }

    stockContainer.className = `egotec-qv-stock ${statusClass}`;
    stockContainer.innerHTML = `<i class="${iconClass}"></i> ${statusText}`;

    // Disable add to cart if out of stock
    const addToCartBtn = document.getElementById("qvAddToCart");
    const buyNowBtn = document.getElementById("qvBuyNow");
    if (stock === 0) {
      addToCartBtn.disabled = true;
      buyNowBtn.disabled = true;
      addToCartBtn.style.opacity = "0.5";
      buyNowBtn.style.opacity = "0.5";
      addToCartBtn.style.cursor = "not-allowed";
      buyNowBtn.style.cursor = "not-allowed";
    } else {
      addToCartBtn.disabled = false;
      buyNowBtn.disabled = false;
      addToCartBtn.style.opacity = "1";
      buyNowBtn.style.opacity = "1";
      addToCartBtn.style.cursor = "pointer";
      buyNowBtn.style.cursor = "pointer";
    }
  }

  renderGallery(product) {
    const images = product.images || [product.image];
    const mainImage = document.getElementById("qvMainImage");
    const thumbnailsContainer = document.getElementById("qvThumbnails");

    // Set main image
    mainImage.src = images[0];
    mainImage.alt = product.name;

    // Render thumbnails
    thumbnailsContainer.innerHTML = "";
    images.forEach((img, index) => {
      const thumbnail = document.createElement("div");
      thumbnail.className = `egotec-qv-thumbnail ${
        index === 0 ? "active" : ""
      }`;
      thumbnail.innerHTML = `<img src="${img}" alt="${product.name}">`;
      thumbnail.addEventListener("click", () => {
        this.changeImage(index);
      });
      thumbnailsContainer.appendChild(thumbnail);
    });
  }

  changeImage(index) {
    const images = this.currentProduct.images || [this.currentProduct.image];
    if (index < 0 || index >= images.length) return;

    this.currentImageIndex = index;
    const mainImage = document.getElementById("qvMainImage");
    mainImage.src = images[index];

    // Update active thumbnail
    document.querySelectorAll(".egotec-qv-thumbnail").forEach((thumb, i) => {
      thumb.classList.toggle("active", i === index);
    });
  }

  previousImage() {
    const images = this.currentProduct.images || [this.currentProduct.image];
    const newIndex =
      this.currentImageIndex === 0
        ? images.length - 1
        : this.currentImageIndex - 1;
    this.changeImage(newIndex);
  }

  nextImage() {
    const images = this.currentProduct.images || [this.currentProduct.image];
    const newIndex = (this.currentImageIndex + 1) % images.length;
    this.changeImage(newIndex);
  }

  handleSwipe() {
    const swipeThreshold = 50;
    const diff = this.touchStartX - this.touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left, go to next image
        this.nextImage();
      } else {
        // Swiped right, go to previous image
        this.previousImage();
      }
    }
  }

  renderMeta(product) {
    const metaContainer = document.getElementById("qvMeta");
    let metaHTML = "";

    if (product.brand) {
      metaHTML += `
        <div class="egotec-qv-meta-item">
          <span class="egotec-qv-meta-label">Brand:</span>
          <span class="egotec-qv-meta-value">${product.brand}</span>
        </div>
      `;
    }

    if (product.category) {
      metaHTML += `
        <div class="egotec-qv-meta-item">
          <span class="egotec-qv-meta-label">Category:</span>
          <span class="egotec-qv-meta-value">${product.category}</span>
        </div>
      `;
    }

    if (product.sku) {
      metaHTML += `
        <div class="egotec-qv-meta-item">
          <span class="egotec-qv-meta-label">SKU:</span>
          <span class="egotec-qv-meta-value">${product.sku}</span>
        </div>
      `;
    }

    metaContainer.innerHTML = metaHTML;
  }

  decreaseQuantity() {
    const qtyInput = document.getElementById("qvQuantity");
    let currentValue = parseInt(qtyInput.value);
    if (currentValue > 1) {
      qtyInput.value = currentValue - 1;
    }
  }

  increaseQuantity() {
    const qtyInput = document.getElementById("qvQuantity");
    const stock = this.currentProduct.stock || 0;
    let currentValue = parseInt(qtyInput.value);
    if (currentValue < stock) {
      qtyInput.value = currentValue + 1;
    }
  }

  addToCart() {
    if (!this.currentProduct) return;

    // Cart functionality is handled by cart-dropdown.js
    // Just show visual feedback here
    const btn = document.getElementById("qvAddToCart");
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Added!';
    btn.style.background = "#28a745";

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = "";
    }, 1500);
  }

  buyNow() {
    if (!this.currentProduct) return;

    const quantity = parseInt(document.getElementById("qvQuantity").value);
    const productId = this.currentProduct.id;

    console.log(`Buy Now: Product ID ${productId}, Quantity: ${quantity}`);

    // Redirect to checkout or cart page
    // window.location.href = `checkout.html?product=${productId}&qty=${quantity}`;

    // For now, just show alert
    alert(`Proceeding to checkout with ${quantity} item(s)`);
  }

  toggleWishlist() {
    if (!this.currentProduct) return;

    const btn = document.getElementById("qvWishlist");
    const icon = btn.querySelector("i");
    const isActive = btn.classList.contains("active");

    if (isActive) {
      btn.classList.remove("active");
      icon.classList.remove("fas");
      icon.classList.add("far");
      btn.innerHTML = '<i class="far fa-heart"></i> Add to Wishlist';
    } else {
      btn.classList.add("active");
      icon.classList.remove("far");
      icon.classList.add("fas");
      btn.innerHTML = '<i class="fas fa-heart"></i> Added to Wishlist';
    }

    console.log(
      `Wishlist ${isActive ? "removed" : "added"}: Product ID ${
        this.currentProduct.id
      }`
    );

    // You can implement actual wishlist functionality here
  }
}

// Initialize Quick View Modal when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new QuickViewModal();
});
