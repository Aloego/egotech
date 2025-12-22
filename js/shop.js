// ============================================
// SHOP PAGE - JAVASCRIPT
// ============================================

// Global variables
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const productsPerPage = 12;
let allCategories = [];
let allBrands = [];

// DOM Elements
const productGrid = document.getElementById("productGrid");
const pagination = document.getElementById("pagination");
const loadingIndicator = document.getElementById("loadingIndicator");
const noResults = document.getElementById("noResults");
const productCount = document.getElementById("productCount");
const promoBannerContainer = document.getElementById("promoBannerContainer");
const shopPromoBanner = document.getElementById("shopPromoBanner");

// Filter elements
const categoryFilter = document.getElementById("categoryFilter");
const priceFilter = document.getElementById("priceFilter");
const brandFilter = document.getElementById("brandFilter");
const featuredFilter = document.getElementById("featuredFilter");
const newArrivalFilter = document.getElementById("newArrivalFilter");
const sortBy = document.getElementById("sortBy");
const clearFiltersBtn = document.getElementById("clearFilters");

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  loadProducts();
  loadPromoData();
  setupEventListeners();
});

// ============================================
// LOAD PRODUCTS FROM JSON
// ============================================
async function loadProducts() {
  try {
    const response = await fetch("data/product.json");
    if (!response.ok) throw new Error("Failed to load products");

    const data = await response.json();
    allProducts = data.products || [];

    // Extract unique categories and brands
    extractCategoriesAndBrands();

    // Populate filter dropdowns
    populateFilters();

    // Initialize filtered products
    filteredProducts = [...allProducts];

    // Render products
    renderProducts();

    // Hide loading indicator
    loadingIndicator.classList.add("d-none");
  } catch (error) {
    console.error("Error loading products:", error);
    loadingIndicator.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Failed to load products. Please try again later.
      </div>
    `;
  }
}

// ============================================
// EXTRACT CATEGORIES AND BRANDS
// ============================================
function extractCategoriesAndBrands() {
  const categorySet = new Set();
  const brandSet = new Set();

  allProducts.forEach((product) => {
    if (product.category) categorySet.add(product.category);
    if (product.brand) brandSet.add(product.brand);
  });

  allCategories = Array.from(categorySet).sort();
  allBrands = Array.from(brandSet).sort();
}

// ============================================
// POPULATE FILTER DROPDOWNS
// ============================================
function populateFilters() {
  // Populate categories
  allCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  // Populate brands
  allBrands.forEach((brand) => {
    const option = document.createElement("option");
    option.value = brand;
    option.textContent = brand;
    brandFilter.appendChild(option);
  });
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Filter change events
  categoryFilter.addEventListener("change", applyFilters);
  priceFilter.addEventListener("change", applyFilters);
  brandFilter.addEventListener("change", applyFilters);
  featuredFilter.addEventListener("change", applyFilters);
  newArrivalFilter.addEventListener("change", applyFilters);
  sortBy.addEventListener("change", applyFilters);

  // Clear filters button
  clearFiltersBtn.addEventListener("click", clearAllFilters);
}

// ============================================
// APPLY FILTERS AND SORTING
// ============================================
function applyFilters() {
  // Start with all products
  filteredProducts = [...allProducts];

  // Category filter
  const selectedCategory = categoryFilter.value;
  if (selectedCategory !== "all") {
    filteredProducts = filteredProducts.filter(
      (product) => product.category === selectedCategory
    );
  }

  // Price filter
  const selectedPrice = priceFilter.value;
  if (selectedPrice !== "all") {
    const [min, max] = selectedPrice.split("-").map(Number);
    filteredProducts = filteredProducts.filter((product) => {
      const price = parseFloat(product.price);
      return price >= min && price <= max;
    });
  }

  // Brand filter
  const selectedBrand = brandFilter.value;
  if (selectedBrand !== "all") {
    filteredProducts = filteredProducts.filter(
      (product) => product.brand === selectedBrand
    );
  }

  // Featured filter
  if (featuredFilter.checked) {
    filteredProducts = filteredProducts.filter(
      (product) => product.featured === "true" || product.featured === true
    );
  }

  // New Arrival filter
  if (newArrivalFilter.checked) {
    filteredProducts = filteredProducts.filter(
      (product) => product.newArrival === "true" || product.newArrival === true
    );
  }

  // Apply sorting
  applySorting();

  // Reset to page 1
  currentPage = 1;

  // Render products
  renderProducts();
}

// ============================================
// APPLY SORTING
// ============================================
function applySorting() {
  const sortValue = sortBy.value;

  switch (sortValue) {
    case "price-low":
      filteredProducts.sort(
        (a, b) => parseFloat(a.price) - parseFloat(b.price)
      );
      break;
    case "price-high":
      filteredProducts.sort(
        (a, b) => parseFloat(b.price) - parseFloat(a.price)
      );
      break;
    case "latest":
      // Assuming products with newArrival are latest
      filteredProducts.sort((a, b) => {
        const aNew = a.newArrival === "true" || a.newArrival === true ? 1 : 0;
        const bNew = b.newArrival === "true" || b.newArrival === true ? 1 : 0;
        return bNew - aNew;
      });
      break;
    case "rating":
      filteredProducts.sort(
        (a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0)
      );
      break;
    default:
      // Default order (as loaded from JSON)
      break;
  }
}

// ============================================
// CLEAR ALL FILTERS
// ============================================
function clearAllFilters() {
  categoryFilter.value = "all";
  priceFilter.value = "all";
  brandFilter.value = "all";
  featuredFilter.checked = false;
  newArrivalFilter.checked = false;
  sortBy.value = "default";

  applyFilters();
}

// ============================================
// RENDER PRODUCTS
// ============================================
function renderProducts() {
  // Update product count
  productCount.textContent = `Showing ${filteredProducts.length} product${
    filteredProducts.length !== 1 ? "s" : ""
  }`;

  // Check if there are products to display
  if (filteredProducts.length === 0) {
    productGrid.innerHTML = "";
    noResults.classList.remove("d-none");
    pagination.innerHTML = "";
    promoBannerContainer.classList.add("d-none");
    return;
  }

  noResults.classList.add("d-none");

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const productsToShow = filteredProducts.slice(startIndex, endIndex);

  // Clear grid
  productGrid.innerHTML = "";

  // Render products
  productsToShow.forEach((product, index) => {
    const productCard = createProductCard(product);
    productGrid.appendChild(productCard);

    // Insert promo banner after 8th product (on first page)
    if (currentPage === 1 && index === 7) {
      // Move promo banner before next row
      const row = document.createElement("div");
      row.className = "col-12 my-4";
      row.appendChild(promoBannerContainer.cloneNode(true));
      productGrid.appendChild(row);
    }
  });

  // Show promo banner on first page if we have enough products
  if (currentPage === 1 && filteredProducts.length >= 8) {
    promoBannerContainer.classList.remove("d-none");
  } else {
    promoBannerContainer.classList.add("d-none");
  }

  // Render pagination
  renderPagination(totalPages);

  // Scroll to top of products
  const shopContent = document.querySelector(".egotec-shop-content");
  if (shopContent) {
    window.scrollTo({
      top: shopContent.offsetTop - 100,
      behavior: "smooth",
    });
  }
}

// ============================================
// CREATE PRODUCT CARD
// ============================================
function createProductCard(product) {
  const col = document.createElement("div");
  col.className = "col-xl-3 col-lg-4 col-md-6 col-sm-6 col-12";

  // Generate star rating HTML
  const rating = parseFloat(product.rating) || 0;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let starsHTML = "";
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star"></i>';
  }
  if (hasHalfStar) {
    starsHTML += '<i class="fas fa-star-half-alt"></i>';
  }
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star"></i>';
  }

  // Format price with Naira symbol
  const price = parseFloat(product.price);
  const formattedPrice = `₦${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  col.innerHTML = `
    <div class="egotec-shop-product-card">
      <!-- Product Image -->
      <a href="product-details.html?id=${
        product.id
      }" class="egotec-shop-product-image">
        <img 
          src="${product.image}" 
          alt="${product.name}"
          onerror="this.src='assets/images/placeholder.png'"
        />
        
        <!-- Wishlist Button -->
        <button class="egotec-wishlist-btn" data-product-id="${
          product.id
        }" aria-label="Add to wishlist">
          <i class="far fa-heart"></i>
        </button>
      </a>

      <!-- Product Details -->
      <div class="egotec-shop-product-details">
        <h3 class="egotec-shop-product-name">
          <a href="product-details.html?id=${product.id}">${product.name}</a>
        </h3>
        
        <div class="egotec-shop-product-price">${formattedPrice}</div>
        
        <div class="egotec-shop-product-rating">
          <div class="egotec-shop-rating-stars">${starsHTML}</div>
          <span class="egotec-shop-rating-count">(${rating.toFixed(1)})</span>
        </div>

        <button class="egotec-add-to-cart-btn" data-product-id="${product.id}">
          <i class="fas fa-shopping-cart"></i>
          Add to Cart
        </button>
        
        <a href="#" class="egotec-quick-view-link" data-product-id="${
          product.id
        }">
          <i class="fas fa-eye"></i>
          Quick View
        </a>
      </div>
    </div>
  `;

  // Add event listeners
  const card = col.querySelector(".egotec-shop-product-card");

  // Wishlist button
  const wishlistBtn = card.querySelector(".egotec-wishlist-btn");
  wishlistBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleWishlist(wishlistBtn, product.id);
  });

  // Add to cart button - handled by cart-dropdown.js globally
  // Quick View link - handled by quick-view-modal.js

  return col;
}

// ============================================
// RENDER PAGINATION
// ============================================
function renderPagination(totalPages) {
  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  let paginationHTML = "";

  // Previous button
  paginationHTML += `
    <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${
        currentPage - 1
      }" aria-label="Previous">
        <i class="fas fa-chevron-left"></i>
      </a>
    </li>
  `;

  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Adjust start if we're near the end
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // First page + ellipsis
  if (startPage > 1) {
    paginationHTML += `
      <li class="page-item">
        <a class="page-link" href="#" data-page="1">1</a>
      </li>
    `;
    if (startPage > 2) {
      paginationHTML += `
        <li class="page-item disabled">
          <span class="page-link">...</span>
        </li>
      `;
    }
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <li class="page-item ${i === currentPage ? "active" : ""}">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }

  // Ellipsis + last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      paginationHTML += `
        <li class="page-item disabled">
          <span class="page-link">...</span>
        </li>
      `;
    }
    paginationHTML += `
      <li class="page-item">
        <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
      </li>
    `;
  }

  // Next button
  paginationHTML += `
    <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#" data-page="${
        currentPage + 1
      }" aria-label="Next">
        <i class="fas fa-chevron-right"></i>
      </a>
    </li>
  `;

  pagination.innerHTML = paginationHTML;

  // Add click listeners to pagination links
  pagination.querySelectorAll("a.page-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = parseInt(link.getAttribute("data-page"));
      if (page && page !== currentPage && page >= 1 && page <= totalPages) {
        currentPage = page;
        renderProducts();
      }
    });
  });
}

// ============================================
// LOAD PROMO DATA
// ============================================
async function loadPromoData() {
  try {
    const response = await fetch("data/promos.json");
    if (!response.ok) throw new Error("Failed to load promo data");

    const data = await response.json();
    if (data.promo) {
      renderPromoBanner(data.promo);
    }
  } catch (error) {
    console.error("Error loading promo data:", error);
  }
}

// ============================================
// RENDER PROMO BANNER
// ============================================
function renderPromoBanner(promo) {
  const backgroundImage = promo.image || "assets/images/default-promo.jpg";

  shopPromoBanner.style.backgroundImage = `url('${backgroundImage}')`;
  shopPromoBanner.innerHTML = `
    <div class="egotec-shop-promo-overlay"></div>
    <div class="egotec-shop-promo-content">
      <h2 class="egotec-shop-promo-title">${promo.title || "Special Offer"}</h2>
      <p class="egotec-shop-promo-message">${
        promo.message || "Don't miss out on our amazing deals!"
      }</p>
      <a href="${promo.buttonLink || "#shop"}" class="egotec-shop-promo-btn">
        ${promo.buttonText || "Shop Now"}
        <i class="fas fa-arrow-right"></i>
      </a>
    </div>
  `;
}

// ============================================
// WISHLIST FUNCTIONALITY
// ============================================
function toggleWishlist(button, productId) {
  button.classList.toggle("active");
  const icon = button.querySelector("i");

  if (button.classList.contains("active")) {
    icon.classList.remove("far");
    icon.classList.add("fas");
    console.log("Added to wishlist:", productId);
    // Add to wishlist logic here
  } else {
    icon.classList.remove("fas");
    icon.classList.add("far");
    console.log("Removed from wishlist:", productId);
    // Remove from wishlist logic here
  }
}

// ============================================
// QUICK VIEW FUNCTIONALITY
// ============================================
// Quick View is now handled by quick-view-modal.js
// This function is no longer needed but kept for reference
/*
function quickView(product) {
  console.log("Quick view:", product);

  // Show quick view modal
  // You can implement a Bootstrap modal here
  showNotification("Quick View - Feature coming soon!", "info");
}
*/

// ============================================
// NOTIFICATION HELPER
// ============================================
function showNotification(message, type = "success") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
  notification.style.zIndex = "9999";
  notification.style.minWidth = "300px";
  notification.textContent = message;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}
