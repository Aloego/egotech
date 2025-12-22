// ============================================
// PRODUCT DETAILS PAGE - JAVASCRIPT
// ============================================

// Global variables
let currentProduct = null;
let allProducts = [];
let currentImageIndex = 0;
let productImages = [];

// DOM Elements
const loadingIndicator = document.getElementById("loadingIndicator");
const productNotFound = document.getElementById("productNotFound");
const productContent = document.getElementById("productContent");
const productTabsSection = document.getElementById("productTabsSection");
const relatedProductsSection = document.getElementById(
  "relatedProductsSection"
);

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  if (productId) {
    loadProductDetails(productId);
  } else {
    showProductNotFound();
  }

  setupEventListeners();
});

// ============================================
// LOAD PRODUCT DETAILS
// ============================================
async function loadProductDetails(productId) {
  console.log("Loading product details for ID:", productId);
  try {
    const response = await fetch("data/product.json");
    if (!response.ok) throw new Error("Failed to load product data");

    const data = await response.json();
    console.log("Product data loaded:", data);
    allProducts = data.products || [];
    console.log("All products:", allProducts);

    // Find product by ID
    currentProduct = allProducts.find((p) => p.id == productId);
    console.log("Current product found:", currentProduct);

    if (currentProduct) {
      renderProductDetails(currentProduct);
      loadRelatedProducts(currentProduct.category);
      setupProductButtons(currentProduct); // Setup buttons after product is loaded
      loadingIndicator.classList.add("d-none");
      productContent.classList.remove("d-none");
      productTabsSection.style.display = "block";
      relatedProductsSection.style.display = "block";
    } else {
      console.error("Product not found with ID:", productId);
      showProductNotFound();
    }
  } catch (error) {
    console.error("Error loading product:", error);
    showProductNotFound();
  }
}

// ============================================
// SHOW PRODUCT NOT FOUND
// ============================================
function showProductNotFound() {
  loadingIndicator.classList.add("d-none");
  productNotFound.classList.remove("d-none");
}

// ============================================
// RENDER PRODUCT DETAILS
// ============================================
function renderProductDetails(product) {
  // Update breadcrumb
  document.getElementById("breadcrumbProduct").textContent = product.name;

  // Setup images
  productImages = product.images || [product.image];
  currentImageIndex = 0;

  // Render gallery
  renderGallery();

  // Product name
  document.getElementById("productName").textContent = product.name;

  // Rating
  renderRating(product.rating);

  // Price
  const price = parseFloat(product.price);
  const formattedPrice = `₦${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  document.getElementById("productPrice").textContent = formattedPrice;

  // Short description
  document.getElementById("shortDescription").textContent =
    product.description || "";

  // Stock status
  renderStockStatus(product.stock);

  // Brand & Category
  document.getElementById("productBrand").textContent = product.brand || "N/A";
  document.getElementById("productCategory").textContent =
    product.category || "N/A";

  // Tabs content
  renderTabsContent(product);

  // Update page title
  document.title = `${product.name} — EgoTech`;
}

// ============================================
// RENDER GALLERY
// ============================================
function renderGallery() {
  const mainImage = document.getElementById("mainImage");
  const thumbnails = document.getElementById("thumbnails");

  // Set main image
  mainImage.src = productImages[currentImageIndex];
  mainImage.alt = currentProduct.name;

  // Clear and render thumbnails
  thumbnails.innerHTML = "";
  productImages.forEach((image, index) => {
    const thumb = document.createElement("div");
    thumb.className = `egotec-thumbnail ${
      index === currentImageIndex ? "active" : ""
    }`;
    thumb.innerHTML = `<img src="${image}" alt="Thumbnail ${index + 1}" />`;
    thumb.addEventListener("click", () => {
      currentImageIndex = index;
      renderGallery();
    });
    thumbnails.appendChild(thumb);
  });
}

// ============================================
// RENDER RATING
// ============================================
function renderRating(rating) {
  const ratingContainer = document.getElementById("productRating");
  const ratingValue = parseFloat(rating) || 0;
  const fullStars = Math.floor(ratingValue);
  const hasHalfStar = ratingValue % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let starsHTML = '<div class="egotec-rating-stars">';
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
  starsHTML += `<span class="egotec-rating-text">(${ratingValue.toFixed(
    1
  )} / 5)</span>`;

  ratingContainer.innerHTML = starsHTML;
}

// ============================================
// RENDER STOCK STATUS
// ============================================
function renderStockStatus(stock) {
  const stockContainer = document.getElementById("stockStatus");
  const stockNum = parseInt(stock) || 0;

  let statusClass = "";
  let statusText = "";
  let icon = "";

  if (stockNum > 10) {
    statusClass = "in-stock";
    statusText = "In Stock";
    icon = '<i class="fas fa-check-circle"></i>';
  } else if (stockNum > 0) {
    statusClass = "low-stock";
    statusText = `Only ${stockNum} left in stock`;
    icon = '<i class="fas fa-exclamation-triangle"></i>';
  } else {
    statusClass = "out-of-stock";
    statusText = "Out of Stock";
    icon = '<i class="fas fa-times-circle"></i>';
  }

  stockContainer.className = `egotec-stock-status ${statusClass}`;
  stockContainer.innerHTML = `${icon} ${statusText}`;

  // Disable add to cart if out of stock
  const addToCartBtn = document.getElementById("addToCartBtn");
  if (stockNum === 0) {
    addToCartBtn.disabled = true;
    addToCartBtn.innerHTML = '<i class="fas fa-ban me-2"></i>Out of Stock';
  }
}

// ============================================
// RENDER TABS CONTENT
// ============================================
function renderTabsContent(product) {
  // Description
  document.getElementById("descriptionContent").innerHTML = `
    <h3>Product Description</h3>
    <p>${product.description || "No description available."}</p>
    ${
      product.features
        ? `
      <h4 class="mt-4 mb-3">Key Features</h4>
      <ul>
        ${product.features.map((f) => `<li>${f}</li>`).join("")}
      </ul>
    `
        : ""
    }
  `;

  // Specifications
  const specs = product.specifications || {
    Brand: product.brand,
    Category: product.category,
    Stock: product.stock,
  };

  let specsHTML = "<h3>Specifications</h3><table class='egotec-specs-table'>";
  for (const [key, value] of Object.entries(specs)) {
    specsHTML += `
      <tr>
        <td>${key}</td>
        <td>${value}</td>
      </tr>
    `;
  }
  specsHTML += "</table>";
  document.getElementById("specificationsContent").innerHTML = specsHTML;

  // Reviews
  const reviews = product.reviews || [];
  let reviewsHTML = "<h3>Customer Reviews</h3>";

  if (reviews.length > 0) {
    reviews.forEach((review) => {
      reviewsHTML += `
        <div class="egotec-review-item">
          <div class="egotec-review-header">
            <span class="egotec-reviewer-name">${review.name}</span>
            <div class="egotec-review-rating">${generateStars(
              review.rating
            )}</div>
          </div>
          <div class="egotec-review-date">${review.date}</div>
          <p class="egotec-review-text">${review.comment}</p>
        </div>
      `;
    });
  } else {
    reviewsHTML +=
      "<p>No reviews yet. Be the first to review this product!</p>";
  }

  document.getElementById("reviewsContent").innerHTML = reviewsHTML;
}

// ============================================
// GENERATE STARS HTML
// ============================================
function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let html = "";
  for (let i = 0; i < fullStars; i++) {
    html += '<i class="fas fa-star"></i>';
  }
  if (hasHalfStar) {
    html += '<i class="fas fa-star-half-alt"></i>';
  }
  for (let i = 0; i < emptyStars; i++) {
    html += '<i class="far fa-star"></i>';
  }
  return html;
}

// ============================================
// LOAD RELATED PRODUCTS
// ============================================
function loadRelatedProducts(category) {
  const relatedProducts = allProducts.filter(
    (p) => p.category === category && p.id !== currentProduct.id
  );

  const carousel = document.getElementById("relatedCarousel");
  carousel.innerHTML = "";

  relatedProducts.slice(0, 8).forEach((product) => {
    const card = createRelatedProductCard(product);
    carousel.appendChild(card);
  });

  // Setup carousel navigation
  setupRelatedCarousel();
}

// ============================================
// CREATE RELATED PRODUCT CARD
// ============================================
function createRelatedProductCard(product) {
  const card = document.createElement("a");
  card.className = "egotec-related-card";
  card.href = `product-details.html?id=${product.id}`;

  const price = parseFloat(product.price);
  const formattedPrice = `₦${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const rating = parseFloat(product.rating) || 0;
  const starsHTML = generateStars(rating);

  card.innerHTML = `
    <div class="egotec-related-image">
      <img src="${product.image}" alt="${product.name}" />
    </div>
    <div class="egotec-related-details">
      <h4 class="egotec-related-name">${product.name}</h4>
      <div class="egotec-related-price">${formattedPrice}</div>
      <div class="egotec-related-rating">
        <div class="egotec-rating-stars">${starsHTML}</div>
        <span class="egotec-related-rating-count">(${rating.toFixed(1)})</span>
      </div>
      <button class="egotec-related-add-cart egotec-btn-add-cart" data-product-id="${
        product.id
      }">
        <i class="fas fa-shopping-cart"></i>
        Add to Cart
      </button>
    </div>
  `;

  return card;
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Gallery navigation arrows
  const prevBtn = document.querySelector(".egotec-gallery-prev");
  const nextBtn = document.querySelector(".egotec-gallery-next");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      currentImageIndex =
        currentImageIndex > 0
          ? currentImageIndex - 1
          : productImages.length - 1;
      renderGallery();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentImageIndex =
        currentImageIndex < productImages.length - 1
          ? currentImageIndex + 1
          : 0;
      renderGallery();
    });
  }

  // Quantity buttons
  const minusBtn = document.querySelector(".egotec-qty-minus");
  const plusBtn = document.querySelector(".egotec-qty-plus");
  const qtyInput = document.getElementById("quantity");

  if (minusBtn) {
    minusBtn.addEventListener("click", () => {
      let qty = parseInt(qtyInput.value);
      if (qty > 1) {
        qtyInput.value = qty - 1;
      }
    });
  }

  if (plusBtn) {
    plusBtn.addEventListener("click", () => {
      let qty = parseInt(qtyInput.value);
      const stock = parseInt(currentProduct?.stock || 0);
      if (qty < stock) {
        qtyInput.value = qty + 1;
      }
    });
  }
}

// ============================================
// SETUP PRODUCT BUTTONS
// ============================================
function setupProductButtons(product) {
  // Add to Cart button
  const addToCartBtn = document.getElementById("addToCartBtn");
  if (addToCartBtn && product) {
    // Set product ID on button for cart-dropdown.js
    addToCartBtn.setAttribute("data-product-id", product.id);

    // Visual feedback only - actual cart logic handled by cart-dropdown.js
    addToCartBtn.addEventListener("click", () => {
      const btn = addToCartBtn;
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check me-2"></i>Added!';
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }, 1500);
    });
  }

  // Add to Wishlist button
  const addToWishlistBtn = document.getElementById("addToWishlistBtn");
  if (addToWishlistBtn && product) {
    addToWishlistBtn.addEventListener("click", () => {
      toggleWishlist(product.id);
    });
  }

  // Touch/swipe for main image on mobile
  let touchStartX = 0;
  let touchEndX = 0;

  const mainImageWrapper = document.querySelector(".egotec-main-image-wrapper");
  if (mainImageWrapper) {
    mainImageWrapper.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
      },
      false
    );

    mainImageWrapper.addEventListener(
      "touchend",
      (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      },
      false
    );
  }

  function handleSwipe() {
    if (touchEndX < touchStartX - 50) {
      // Swipe left - next image
      currentImageIndex =
        currentImageIndex < productImages.length - 1
          ? currentImageIndex + 1
          : 0;
      renderGallery();
    }
    if (touchEndX > touchStartX + 50) {
      // Swipe right - previous image
      currentImageIndex =
        currentImageIndex > 0
          ? currentImageIndex - 1
          : productImages.length - 1;
      renderGallery();
    }
  }
}

// ============================================
// SETUP RELATED CAROUSEL
// ============================================
function setupRelatedCarousel() {
  const carousel = document.getElementById("relatedCarousel");
  const prevBtn = document.querySelector(".egotec-related-prev");
  const nextBtn = document.querySelector(".egotec-related-next");

  if (!carousel || !prevBtn || !nextBtn) return;

  prevBtn.addEventListener("click", () => {
    carousel.scrollBy({
      left: -300,
      behavior: "smooth",
    });
  });

  nextBtn.addEventListener("click", () => {
    carousel.scrollBy({
      left: 300,
      behavior: "smooth",
    });
  });
}

// Cart functionality is handled by cart-dropdown.js
// The old addToCart function has been removed

// ============================================
// TOGGLE WISHLIST FUNCTION
// ============================================
function toggleWishlist(productId) {
  const btn = document.getElementById("addToWishlistBtn");
  const icon = btn.querySelector("i");

  if (icon.classList.contains("far")) {
    // Add to wishlist
    icon.classList.remove("far");
    icon.classList.add("fas");
    btn.innerHTML = '<i class="fas fa-heart me-2"></i>Added to Wishlist';
    console.log(`Product ${productId} added to wishlist`);
  } else {
    // Remove from wishlist
    icon.classList.remove("fas");
    icon.classList.add("far");
    btn.innerHTML = '<i class="far fa-heart me-2"></i>Add to Wishlist';
    console.log(`Product ${productId} removed from wishlist`);
  }
}
