// ============================================
// CATEGORY HIGHLIGHTS CAROUSEL
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  // ============================================
  // PROMO BANNER: Load data/promos.json and render
  // ============================================
  const promoSection = document.querySelector(".egotec-promo-banner");
  const promoTitleEl = document.getElementById("promoTitle");
  const promoMessageEl = document.getElementById("promoMessage");
  const promoCtaEl = document.getElementById("promoCta");

  if (promoSection && promoTitleEl && promoMessageEl && promoCtaEl) {
    fetch("data/promos.json")
      .then((resp) =>
        resp.ok ? resp.json() : Promise.reject("Promo load failed")
      )
      .then((json) => {
        const promo = json?.promo || {};
        const title = promo.title || "Unmissable Deals";
        const message =
          promo.message || "Save on top tech picks. Limited time only!";
        const buttonText = promo.buttonText || "Shop Now";
        const buttonLink = promo.buttonLink || "#shop";
        const image = promo.image || "assets/images/promo-banner.jpg";

        // Populate content
        promoTitleEl.textContent = title;
        promoMessageEl.textContent = message;

        if (buttonText && buttonLink) {
          // Set text and append a FA arrow icon
          promoCtaEl.textContent = buttonText;
          const icon = document.createElement("i");
          icon.className = "fas fa-arrow-right ms-2";
          promoCtaEl.appendChild(icon);
          promoCtaEl.setAttribute("href", buttonLink);
          promoCtaEl.classList.remove("d-none");
        } else {
          promoCtaEl.classList.add("d-none");
        }

        // Background image with cover
        promoSection.style.backgroundImage = `url('${image}')`;

        // Initialize promo reveal animations
        initPromoReveal();
      })
      .catch((e) => {
        // Fallback content on error
        promoTitleEl.textContent = "Latest Promotions";
        promoMessageEl.textContent =
          "Discover fresh arrivals and exclusive offers today.";
        promoCtaEl.textContent = "Explore";
        const icon = document.createElement("i");
        icon.className = "fas fa-arrow-right ms-2";
        promoCtaEl.appendChild(icon);
        promoCtaEl.setAttribute("href", "#shop");
        promoSection.style.backgroundImage =
          "linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)";

        // Initialize promo reveal animations for fallback content
        initPromoReveal();
      });
  }

  function initPromoReveal() {
    const animated = promoSection?.querySelectorAll(".egotec-animate") || [];
    if (!animated.length) return;

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in-view");
              obs.unobserve(entry.target);
            }
          });
        },
        { root: null, threshold: 0.3 }
      );

      animated.forEach((el, idx) => {
        el.style.transitionDelay = `${idx * 80}ms`;
        io.observe(el);
      });
    } else {
      animated.forEach((el) => el.classList.add("in-view"));
    }
  }
});

// ============================================
// CATEGORY HIGHLIGHTS CAROUSEL
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  const carousel = document.querySelector(".egotec-category-carousel");
  const leftArrow = document.querySelector(".egotec-carousel-arrow-left");
  const rightArrow = document.querySelector(".egotec-carousel-arrow-right");

  // Fetch products.json and extract unique categories
  fetch("data/product.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load products.json");
      }
      return response.json();
    })
    .then((data) => {
      // Extract unique categories
      const categories = [...new Set(data.products.map((p) => p.category))];

      // Build category cards dynamically
      categories.forEach((category) => {
        const card = document.createElement("div");
        card.className = "egotec-category-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute("aria-label", `Browse ${category} category`);

        // Create image element
        const img = document.createElement("img");
        img.src = `assets/images/categories/${category}.png`;
        img.alt = `${category} Category`;
        img.onerror = function () {
          // Fallback to placeholder if image not found
          this.src = "https://via.placeholder.com/240x240?text=" + category;
        };

        // Create overlay
        const overlay = document.createElement("div");
        overlay.className = "egotec-category-overlay";

        // Create category name
        const name = document.createElement("span");
        name.className = "egotec-category-name";
        name.textContent = category;

        // Assemble card
        overlay.appendChild(name);
        card.appendChild(img);
        card.appendChild(overlay);
        carousel.appendChild(card);

        // Add click event to navigate to category page
        card.addEventListener("click", function () {
          // Navigate to category page (implement as needed)
          window.location.href = `products.html?category=${encodeURIComponent(
            category
          )}`;
        });

        // Add keyboard support
        card.addEventListener("keypress", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.click();
          }
        });
      });

      // Duplicate cards for seamless infinite scroll
      const clonedCards = carousel.innerHTML;
      carousel.innerHTML += clonedCards;
    })
    .catch((error) => {
      console.error("Error loading categories:", error);
      // Show fallback message
      carousel.innerHTML =
        '<p class="text-center w-100 text-muted">Unable to load categories. Please try again later.</p>';
    });

  // Arrow navigation (desktop/tablet only) with seamless infinite loop
  function scrollCarousel(direction) {
    const cardWidth =
      carousel.querySelector(".egotec-category-card")?.offsetWidth || 220;
    const gap = 24; // 1.5rem in pixels
    const scrollAmount = cardWidth + gap; // Scroll 1 card at a time for smoother reset
    const maxScroll = carousel.scrollWidth / 2; // Half of total width (original cards)

    // Check if we need to reset before scrolling
    if (carousel.scrollLeft >= maxScroll - 50) {
      carousel.scrollLeft = carousel.scrollLeft - maxScroll;
    } else if (carousel.scrollLeft <= 50 && direction === -1) {
      carousel.scrollLeft = carousel.scrollLeft + maxScroll;
    }

    carousel.scrollBy({
      left: direction * scrollAmount,
      behavior: "smooth",
    });
  }

  if (leftArrow) {
    leftArrow.addEventListener("click", () => scrollCarousel(-1));
  }

  if (rightArrow) {
    rightArrow.addEventListener("click", () => scrollCarousel(1));
  }

  // Auto-scroll every 3 seconds
  let categoryAutoScroll = setInterval(() => {
    scrollCarousel(1);
  }, 3000);

  // Pause auto-scroll on hover
  if (carousel) {
    carousel.addEventListener("mouseenter", () => {
      clearInterval(categoryAutoScroll);
    });

    carousel.addEventListener("mouseleave", () => {
      categoryAutoScroll = setInterval(() => {
        scrollCarousel(1);
      }, 3000);
    });
  }
});

// ============================================
// FEATURED PRODUCTS CAROUSEL
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  const featuredCarousel = document.getElementById("featuredProductsCarousel");
  const featuredLeftArrow = document.querySelector(
    ".egotec-featured-arrow-left"
  );
  const featuredRightArrow = document.querySelector(
    ".egotec-featured-arrow-right"
  );

  // Fetch products.json and filter featured products
  fetch("data/product.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load products.json");
      }
      return response.json();
    })
    .then((data) => {
      // Filter featured products (checking for both string "true" and boolean true)
      const featuredProducts = data.products.filter(
        (product) => product.featured === "true" || product.featured === true
      );

      if (featuredProducts.length === 0) {
        featuredCarousel.innerHTML =
          '<p class="text-center w-100 text-muted">No featured products available at this time.</p>';
        return;
      }

      // Build product cards dynamically
      featuredProducts.forEach((product) => {
        const card = document.createElement("div");
        card.className = "egotec-product-card";

        // Format price with currency
        const formattedPrice = new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: product.currency || "NGN",
        }).format(product.price);

        // Generate star rating
        const rating = product.rating || 0;
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

        card.innerHTML = `
          <a href="product-details.html?id=${
            product.id
          }" class="egotec-product-image">
            <img src="${product.image}" alt="${
          product.name
        }" class="img-fluid" onerror="this.src='https://via.placeholder.com/300x280?text=${encodeURIComponent(
          product.name
        )}'">
          </a>
          <div class="egotec-product-details">
            <h3 class="egotec-product-name">
              <a href="product-details.html?id=${product.id}">${
          product.name
        }</a>
            </h3>
            <div class="egotec-product-price">${formattedPrice}</div>
            <div class="egotec-product-rating">
              ${starsHTML}
              <span class="egotec-rating-value">(${rating.toFixed(1)})</span>
            </div>
            <button class="egotec-add-to-cart-btn egotec-btn-add-cart" data-product-id="${
              product.id
            }">
              <i class="fas fa-shopping-cart"></i>
              Add to Cart
            </button>
            <a href="product-details.html?id=${
              product.id
            }" class="egotec-quick-view-link egotec-btn-quick-view" data-product-id="${
          product.id
        }">
              <i class="fas fa-eye"></i>
              Quick View
            </a>
          </div>
        `;

        featuredCarousel.appendChild(card);
      });

      // Duplicate cards for seamless infinite scroll
      const clonedFeaturedCards = featuredCarousel.innerHTML;
      featuredCarousel.innerHTML += clonedFeaturedCards;

      // Add event listeners for Add to Cart buttons
      document.querySelectorAll(".egotec-btn-add-cart").forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          const productId = this.getAttribute("data-product-id");
          // Implement add to cart functionality
          console.log(`Add to cart: Product ID ${productId}`);
          // You can add cart logic here or trigger a custom event
        });
      });

      // Add event listeners for Quick View buttons
      document.querySelectorAll(".egotec-btn-quick-view").forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          const productId = this.getAttribute("data-product-id");
          // Implement quick view modal functionality
          console.log(`Quick view: Product ID ${productId}`);
          // You can open a modal or navigate to product page
        });
      });
    })
    .catch((error) => {
      console.error("Error loading featured products:", error);
      featuredCarousel.innerHTML =
        '<p class="text-center w-100 text-muted">Unable to load featured products. Please try again later.</p>';
    });

  // Arrow navigation (desktop/tablet only) with seamless infinite loop
  function scrollFeaturedCarousel(direction) {
    const cardWidth =
      featuredCarousel.querySelector(".egotec-product-card")?.offsetWidth ||
      280;
    const gap = 24; // 1.5rem in pixels
    const scrollAmount = cardWidth + gap; // Scroll 1 card at a time for smoother reset
    const maxScroll = featuredCarousel.scrollWidth / 2; // Half of total width (original cards)

    // Check if we need to reset before scrolling
    if (featuredCarousel.scrollLeft >= maxScroll - 50) {
      featuredCarousel.scrollLeft = featuredCarousel.scrollLeft - maxScroll;
    } else if (featuredCarousel.scrollLeft <= 50 && direction === -1) {
      featuredCarousel.scrollLeft = featuredCarousel.scrollLeft + maxScroll;
    }

    featuredCarousel.scrollBy({
      left: direction * scrollAmount,
      behavior: "smooth",
    });
  }

  if (featuredLeftArrow) {
    featuredLeftArrow.addEventListener("click", () =>
      scrollFeaturedCarousel(-1)
    );
  }

  if (featuredRightArrow) {
    featuredRightArrow.addEventListener("click", () =>
      scrollFeaturedCarousel(1)
    );
  }

  // Auto-scroll every 3 seconds
  let featuredAutoScroll = setInterval(() => {
    scrollFeaturedCarousel(1);
  }, 3000);

  // Pause auto-scroll on hover
  if (featuredCarousel) {
    featuredCarousel.addEventListener("mouseenter", () => {
      clearInterval(featuredAutoScroll);
    });

    featuredCarousel.addEventListener("mouseleave", () => {
      featuredAutoScroll = setInterval(() => {
        scrollFeaturedCarousel(1);
      }, 3000);
    });
  }
});

// ============================================
// NEW ARRIVALS CAROUSEL
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  const newArrivalsCarousel = document.getElementById("newArrivalsCarousel");
  const newArrivalsLeftArrow = document.querySelector(
    ".egotec-new-arrivals-arrow-left"
  );
  const newArrivalsRightArrow = document.querySelector(
    ".egotec-new-arrivals-arrow-right"
  );

  // Fetch products.json and filter new arrivals
  fetch("data/product.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load products.json");
      }
      return response.json();
    })
    .then((data) => {
      // Filter new arrival products (checking for both string "true" and boolean true)
      const newArrivalProducts = data.products
        .filter(
          (product) =>
            product.newArrival === "true" || product.newArrival === true
        )
        .slice(0, 4); // Limit to 4 products

      if (newArrivalProducts.length === 0) {
        newArrivalsCarousel.innerHTML =
          '<p class="text-center w-100 text-muted">No new arrivals available at this time.</p>';
        return;
      }

      // Build product cards dynamically
      newArrivalProducts.forEach((product) => {
        const card = document.createElement("div");
        card.className = "egotec-product-card";

        // Format price with currency
        const formattedPrice = new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: product.currency || "NGN",
        }).format(product.price);

        card.innerHTML = `
          <a href="product-details.html?id=${
            product.id
          }" class="egotec-product-image">
            <img src="${product.image}" alt="${
          product.name
        }" class="img-fluid" onerror="this.src='https://via.placeholder.com/300x280?text=${encodeURIComponent(
          product.name
        )}'">
          </a>
          <div class="egotec-product-details">
            <h3 class="egotec-product-name">
              <a href="product-details.html?id=${product.id}">${
          product.name
        }</a>
            </h3>
            <div class="egotec-product-price">${formattedPrice}</div>
            <button class="egotec-add-to-cart-btn egotec-btn-add-cart" data-product-id="${
              product.id
            }">
              <i class="fas fa-shopping-cart"></i>
              Add to Cart
            </button>
            <a href="product-details.html?id=${
              product.id
            }" class="egotec-quick-view-link egotec-btn-quick-view" data-product-id="${
          product.id
        }">
              <i class="fas fa-eye"></i>
              Quick View
            </a>
          </div>
        `;

        newArrivalsCarousel.appendChild(card);
      });

      // Duplicate cards for seamless infinite scroll
      const clonedNewArrivalsCards = newArrivalsCarousel.innerHTML;
      newArrivalsCarousel.innerHTML += clonedNewArrivalsCards;

      // Add event listeners for Add to Cart buttons
      document.querySelectorAll(".egotec-btn-add-cart").forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          const productId = this.getAttribute("data-product-id");
          console.log(`Add to cart: Product ID ${productId}`);
        });
      });

      // Add event listeners for Quick View buttons
      document.querySelectorAll(".egotec-btn-quick-view").forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          const productId = this.getAttribute("data-product-id");
          console.log(`Quick view: Product ID ${productId}`);
        });
      });
    })
    .catch((error) => {
      console.error("Error loading new arrivals:", error);
      newArrivalsCarousel.innerHTML =
        '<p class="text-center w-100 text-muted">Unable to load new arrivals. Please try again later.</p>';
    });

  // Arrow navigation with seamless infinite loop
  function scrollNewArrivalsCarousel(direction) {
    const cardWidth =
      newArrivalsCarousel.querySelector(".egotec-product-card")?.offsetWidth ||
      280;
    const gap = 24; // 1.5rem in pixels
    const scrollAmount = cardWidth + gap; // Scroll 1 card at a time
    const maxScroll = newArrivalsCarousel.scrollWidth / 2; // Half of total width

    // Check if we need to reset before scrolling
    if (newArrivalsCarousel.scrollLeft >= maxScroll - 50) {
      newArrivalsCarousel.scrollLeft =
        newArrivalsCarousel.scrollLeft - maxScroll;
    } else if (newArrivalsCarousel.scrollLeft <= 50 && direction === -1) {
      newArrivalsCarousel.scrollLeft =
        newArrivalsCarousel.scrollLeft + maxScroll;
    }

    newArrivalsCarousel.scrollBy({
      left: direction * scrollAmount,
      behavior: "smooth",
    });
  }

  if (newArrivalsLeftArrow) {
    newArrivalsLeftArrow.addEventListener("click", () =>
      scrollNewArrivalsCarousel(-1)
    );
  }

  if (newArrivalsRightArrow) {
    newArrivalsRightArrow.addEventListener("click", () =>
      scrollNewArrivalsCarousel(1)
    );
  }

  // Auto-scroll every 2 seconds
  let newArrivalsAutoScroll = setInterval(() => {
    scrollNewArrivalsCarousel(1);
  }, 2000);

  // Pause auto-scroll on hover
  if (newArrivalsCarousel) {
    newArrivalsCarousel.addEventListener("mouseenter", () => {
      clearInterval(newArrivalsAutoScroll);
    });

    newArrivalsCarousel.addEventListener("mouseleave", () => {
      newArrivalsAutoScroll = setInterval(() => {
        scrollNewArrivalsCarousel(1);
      }, 2000);
    });
  }
});

// ============================================
// ALL PRODUCTS CAROUSEL
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  const allProductsCarousel = document.getElementById("allProductsCarousel");
  const allProductsLeftArrow = document.querySelector(
    ".egotec-all-products-arrow-left"
  );
  const allProductsRightArrow = document.querySelector(
    ".egotec-all-products-arrow-right"
  );

  // Fetch products.json and display all products
  fetch("data/product.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to load products.json");
      }
      return response.json();
    })
    .then((data) => {
      const allProducts = data.products;

      if (allProducts.length === 0) {
        allProductsCarousel.innerHTML =
          '<p class="text-center w-100 text-muted">No products available at this time.</p>';
        return;
      }

      // Build product cards dynamically
      allProducts.forEach((product) => {
        const card = document.createElement("div");
        card.className = "egotec-product-card";

        // Format price with currency
        const formattedPrice = new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: product.currency || "NGN",
        }).format(product.price);

        // Generate star rating
        const rating = product.rating || 0;
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

        card.innerHTML = `
          <a href="product-details.html?id=${
            product.id
          }" class="egotec-product-image">
            <img src="${product.image}" alt="${
          product.name
        }" class="img-fluid" onerror="this.src='https://via.placeholder.com/300x280?text=${encodeURIComponent(
          product.name
        )}'">
          </a>
          <div class="egotec-product-details">
            <h3 class="egotec-product-name">
              <a href="product-details.html?id=${product.id}">${
          product.name
        }</a>
            </h3>
            <div class="egotec-product-price">${formattedPrice}</div>
            <div class="egotec-product-rating">
              ${starsHTML}
              <span class="egotec-rating-value">(${rating.toFixed(1)})</span>
            </div>
            <button class="egotec-add-to-cart-btn egotec-btn-add-cart" data-product-id="${
              product.id
            }">
              <i class="fas fa-shopping-cart"></i>
              Add to Cart
            </button>
            <a href="product-details.html?id=${
              product.id
            }" class="egotec-quick-view-link egotec-btn-quick-view" data-product-id="${
          product.id
        }">
              <i class="fas fa-eye"></i>
              Quick View
            </a>
          </div>
        `;

        allProductsCarousel.appendChild(card);
      });

      // Duplicate cards for seamless infinite scroll
      const clonedAllProductsCards = allProductsCarousel.innerHTML;
      allProductsCarousel.innerHTML += clonedAllProductsCards;

      // Add event listeners for Add to Cart buttons
      document.querySelectorAll(".egotec-btn-add-cart").forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          const productId = this.getAttribute("data-product-id");
          console.log(`Add to cart: Product ID ${productId}`);
        });
      });

      // Add event listeners for Quick View buttons
      document.querySelectorAll(".egotec-btn-quick-view").forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          const productId = this.getAttribute("data-product-id");
          console.log(`Quick view: Product ID ${productId}`);
        });
      });
    })
    .catch((error) => {
      console.error("Error loading all products:", error);
      allProductsCarousel.innerHTML =
        '<p class="text-center w-100 text-muted">Unable to load products. Please try again later.</p>';
    });

  // Arrow navigation with seamless infinite loop
  function scrollAllProductsCarousel(direction) {
    const cardWidth =
      allProductsCarousel.querySelector(".egotec-product-card")?.offsetWidth ||
      280;
    const gap = 24; // 1.5rem in pixels
    const scrollAmount = cardWidth + gap; // Scroll 1 card at a time
    const maxScroll = allProductsCarousel.scrollWidth / 2; // Half of total width

    // Check if we need to reset before scrolling
    if (allProductsCarousel.scrollLeft >= maxScroll - 50) {
      allProductsCarousel.scrollLeft =
        allProductsCarousel.scrollLeft - maxScroll;
    } else if (allProductsCarousel.scrollLeft <= 50 && direction === -1) {
      allProductsCarousel.scrollLeft =
        allProductsCarousel.scrollLeft + maxScroll;
    }

    allProductsCarousel.scrollBy({
      left: direction * scrollAmount,
      behavior: "smooth",
    });
  }

  if (allProductsLeftArrow) {
    allProductsLeftArrow.addEventListener("click", () =>
      scrollAllProductsCarousel(-1)
    );
  }

  if (allProductsRightArrow) {
    allProductsRightArrow.addEventListener("click", () =>
      scrollAllProductsCarousel(1)
    );
  }

  // Auto-scroll every 3 seconds
  let allProductsAutoScroll = setInterval(() => {
    scrollAllProductsCarousel(1);
  }, 3000);

  // Pause auto-scroll on hover
  if (allProductsCarousel) {
    allProductsCarousel.addEventListener("mouseenter", () => {
      clearInterval(allProductsAutoScroll);
    });

    allProductsCarousel.addEventListener("mouseleave", () => {
      allProductsAutoScroll = setInterval(() => {
        scrollAllProductsCarousel(1);
      }, 3000);
    });
  }
});

// ============================================
// NEWSLETTER SUBSCRIPTION FUNCTIONALITY
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  const newsletterForm = document.getElementById("newsletterForm");
  const newsletterEmail = document.getElementById("newsletterEmail");
  const newsletterMessage = document.getElementById("newsletterMessage");

  if (newsletterForm) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();

      // Get email value
      const email = newsletterEmail.value.trim();

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email) {
        showMessage("Please enter your email address.", "error");
        return;
      }

      if (!emailRegex.test(email)) {
        showMessage("Please enter a valid email address.", "error");
        return;
      }

      // Simulate subscription process
      newsletterMessage.textContent = "Subscribing...";
      newsletterMessage.className = "egotec-newsletter-message";

      // Simulate API call with timeout
      setTimeout(() => {
        // In a real application, you would send this to your backend
        console.log("Newsletter subscription:", email);

        // Show success message
        showMessage(
          "🎉 Thank you for subscribing! Check your email for confirmation.",
          "success"
        );

        // Clear the input
        newsletterEmail.value = "";

        // Clear message after 5 seconds
        setTimeout(() => {
          newsletterMessage.textContent = "";
          newsletterMessage.className = "egotec-newsletter-message";
        }, 5000);
      }, 1000);
    });

    // Helper function to show messages
    function showMessage(message, type) {
      newsletterMessage.textContent = message;
      newsletterMessage.className = `egotec-newsletter-message ${type}`;
    }

    // Clear error message when user starts typing
    newsletterEmail.addEventListener("input", function () {
      if (newsletterMessage.classList.contains("error")) {
        newsletterMessage.textContent = "";
        newsletterMessage.className = "egotec-newsletter-message";
      }
    });
  }
});
