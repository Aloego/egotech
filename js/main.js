// ============================================
// PROMO BANNER
// ============================================

document.addEventListener("DOMContentLoaded", function () {
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

        promoTitleEl.textContent = title;
        promoMessageEl.textContent = message;

        if (buttonText && buttonLink) {
          promoCtaEl.textContent = buttonText;
          const icon = document.createElement("i");
          icon.className = "fas fa-arrow-right ms-2";
          promoCtaEl.appendChild(icon);
          promoCtaEl.setAttribute("href", buttonLink);
          promoCtaEl.classList.remove("d-none");
        } else {
          promoCtaEl.classList.add("d-none");
        }

        promoSection.style.backgroundImage = `url('${image}')`;
        initPromoReveal();
      })
      .catch((e) => {
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
  fetch("data/product.json")
    .then((response) => response.json())
    .then((data) => {
      const categories = [...new Set(data.products.map((p) => p.category))];
      const carousel = $(".egotec-category-carousel");

      categories.forEach((category) => {
        const item = `
          <div class="egotec-category-card" data-category="${category}" style="cursor:pointer;">
            <img
              src="assets/images/categories/${category}.png"
              alt="${category} Category"
              onerror="this.src='assets/images/products/shop03.png'"
            />
            <div class="egotec-category-overlay">
              <span class="egotec-category-name">${category}</span>
            </div>
          </div>
        `;
        carousel.append(item);
      });

      carousel.owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 3000,
        autoplayHoverPause: true,
        nav: true,
        navText: [
          '<i class="fas fa-chevron-left"></i>',
          '<i class="fas fa-chevron-right"></i>',
        ],
        dots: false,
        responsive: {
          0: { items: 1 },
          480: { items: 2 },
          768: { items: 3 },
          1024: { items: 4 },
          1200: { items: 4 },
        },
      });

      // Click handler for category cards
      $(document).on("click", ".egotec-category-card", function () {
        const cat = $(this).data("category");
        if (cat)
          window.location.href = `shop.html?category=${encodeURIComponent(cat)}`;
      });
    })
    .catch((error) => {
      console.error("Error loading categories:", error);
      $(".egotec-category-carousel").html(
        '<p class="text-center w-100 text-muted">Unable to load categories. Please try again later.</p>'
      );
    });
});

// ============================================
// FEATURED PRODUCTS CAROUSEL
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  fetch("data/product.json")
    .then((response) => response.json())
    .then((data) => {
      const featuredProducts = data.products.filter(
        (product) => product.featured === true
      );
      const carousel = $("#featuredProductsCarousel");

      if (featuredProducts.length === 0) {
        carousel.html(
          '<p class="text-center w-100 text-muted">No featured products available at this time.</p>'
        );
        return;
      }

      featuredProducts.forEach((product) => {
        const formattedPrice = EgoTechUtils.formatCurrency(product.price);
        const rating = product.rating || 0;
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHTML = "";
        for (let i = 0; i < fullStars; i++)
          starsHTML += '<i class="fas fa-star"></i>';
        if (hasHalfStar) starsHTML += '<i class="fas fa-star-half-alt"></i>';
        for (let i = 0; i < emptyStars; i++)
          starsHTML += '<i class="far fa-star"></i>';

        const item = `
          <div class="egotec-product-card">
            <a href="product-details.html?id=${product.id}" class="egotec-product-image">
              <img src="${product.image}" alt="${product.name}" class="img-fluid"
                onerror="this.src='assets/images/products/product01.png'">
            </a>
            <div class="egotec-product-details">
              <h3 class="egotec-product-name">
                <a href="product-details.html?id=${product.id}">${product.name}</a>
              </h3>
              <div class="egotec-product-price">${formattedPrice}</div>
              <div class="egotec-product-rating">
                ${starsHTML}
                <span class="egotec-rating-value">(${rating.toFixed(1)})</span>
              </div>
              <button class="egotec-add-to-cart-btn egotec-btn-add-cart" data-product-id="${product.id}">
                <i class="fas fa-shopping-cart"></i> Add to Cart
              </button>
              <a href="product-details.html?id=${product.id}" class="egotec-quick-view-link egotec-btn-quick-view" data-product-id="${product.id}">
                <i class="fas fa-eye"></i> Quick View
              </a>
            </div>
          </div>
        `;
        carousel.append(item);
      });

      carousel.owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 3000,
        autoplayHoverPause: true,
        nav: true,
        navText: [
          '<i class="fas fa-chevron-left"></i>',
          '<i class="fas fa-chevron-right"></i>',
        ],
        dots: false,
        responsive: {
          0: { items: 1 },
          480: { items: 2 },
          768: { items: 2 },
          1024: { items: 4 },
        },
      });
    })
    .catch((error) => {
      console.error("Error loading featured products:", error);
      $("#featuredProductsCarousel").html(
        '<p class="text-center w-100 text-muted">Unable to load featured products. Please try again later.</p>'
      );
    });
});

// ============================================
// NEW ARRIVALS CAROUSEL
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  fetch("data/product.json")
    .then((response) => response.json())
    .then((data) => {
      const newArrivalProducts = data.products
        .filter((product) => product.newArrival === true)
        .slice(0, 8);
      const carousel = $("#newArrivalsCarousel");

      if (newArrivalProducts.length === 0) {
        carousel.html(
          '<p class="text-center w-100 text-muted">No new arrivals available at this time.</p>'
        );
        return;
      }

      newArrivalProducts.forEach((product) => {
        const formattedPrice = EgoTechUtils.formatCurrency(product.price);

        const item = `
          <div class="egotec-product-card">
            <a href="product-details.html?id=${product.id}" class="egotec-product-image">
              <img src="${product.image}" alt="${product.name}" class="img-fluid"
                onerror="this.src='assets/images/products/product01.png'">
            </a>
            <div class="egotec-product-details">
              <h3 class="egotec-product-name">
                <a href="product-details.html?id=${product.id}">${product.name}</a>
              </h3>
              <div class="egotec-product-price">${formattedPrice}</div>
              <button class="egotec-add-to-cart-btn egotec-btn-add-cart" data-product-id="${product.id}">
                <i class="fas fa-shopping-cart"></i> Add to Cart
              </button>
              <a href="product-details.html?id=${product.id}" class="egotec-quick-view-link egotec-btn-quick-view" data-product-id="${product.id}">
                <i class="fas fa-eye"></i> Quick View
              </a>
            </div>
          </div>
        `;
        carousel.append(item);
      });

      carousel.owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 2000,
        autoplayHoverPause: true,
        nav: true,
        navText: [
          '<i class="fas fa-chevron-left"></i>',
          '<i class="fas fa-chevron-right"></i>',
        ],
        dots: false,
        responsive: {
          0: { items: 1 },
          480: { items: 2 },
          768: { items: 2 },
          1024: { items: 4 },
        },
      });
    })
    .catch((error) => {
      console.error("Error loading new arrivals:", error);
      $("#newArrivalsCarousel").html(
        '<p class="text-center w-100 text-muted">Unable to load new arrivals. Please try again later.</p>'
      );
    });
});

// ============================================
// ALL PRODUCTS CAROUSEL
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  fetch("data/product.json")
    .then((response) => response.json())
    .then((data) => {
      const allProducts = data.products;
      const carousel = $("#allProductsCarousel");

      if (allProducts.length === 0) {
        carousel.html(
          '<p class="text-center w-100 text-muted">No products available at this time.</p>'
        );
        return;
      }

      allProducts.forEach((product) => {
        const formattedPrice = EgoTechUtils.formatCurrency(product.price);
        const rating = product.rating || 0;
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let starsHTML = "";
        for (let i = 0; i < fullStars; i++)
          starsHTML += '<i class="fas fa-star"></i>';
        if (hasHalfStar) starsHTML += '<i class="fas fa-star-half-alt"></i>';
        for (let i = 0; i < emptyStars; i++)
          starsHTML += '<i class="far fa-star"></i>';

        const item = `
          <div class="egotec-product-card">
            <a href="product-details.html?id=${product.id}" class="egotec-product-image">
              <img src="${product.image}" alt="${product.name}" class="img-fluid"
                onerror="this.src='assets/images/products/product01.png'">
            </a>
            <div class="egotec-product-details">
              <h3 class="egotec-product-name">
                <a href="product-details.html?id=${product.id}">${product.name}</a>
              </h3>
              <div class="egotec-product-price">${formattedPrice}</div>
              <div class="egotec-product-rating">
                ${starsHTML}
                <span class="egotec-rating-value">(${rating.toFixed(1)})</span>
              </div>
              <button class="egotec-add-to-cart-btn egotec-btn-add-cart" data-product-id="${product.id}">
                <i class="fas fa-shopping-cart"></i> Add to Cart
              </button>
              <a href="product-details.html?id=${product.id}" class="egotec-quick-view-link egotec-btn-quick-view" data-product-id="${product.id}">
                <i class="fas fa-eye"></i> Quick View
              </a>
            </div>
          </div>
        `;
        carousel.append(item);
      });

      carousel.owlCarousel({
        loop: true,
        autoplay: true,
        autoplayTimeout: 3000,
        autoplayHoverPause: true,
        nav: true,
        navText: [
          '<i class="fas fa-chevron-left"></i>',
          '<i class="fas fa-chevron-right"></i>',
        ],
        dots: false,
        responsive: {
          0: { items: 1 },
          480: { items: 2 },
          768: { items: 2 },
          1024: { items: 4 },
        },
      });
    })
    .catch((error) => {
      console.error("Error loading all products:", error);
      $("#allProductsCarousel").html(
        '<p class="text-center w-100 text-muted">Unable to load products. Please try again later.</p>'
      );
    });
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

      const email = newsletterEmail.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email) {
        showMessage("Please enter your email address.", "error");
        return;
      }

      if (!emailRegex.test(email)) {
        showMessage("Please enter a valid email address.", "error");
        return;
      }

      newsletterMessage.textContent = "Subscribing...";
      newsletterMessage.className = "egotec-newsletter-message";

      setTimeout(() => {
        console.log("Newsletter subscription:", email);

        showMessage(
          "🎉 Thank you for subscribing! Check your email for confirmation.",
          "success"
        );

        newsletterEmail.value = "";

        setTimeout(() => {
          newsletterMessage.textContent = "";
          newsletterMessage.className = "egotec-newsletter-message";
        }, 5000);
      }, 1000);
    });

    function showMessage(message, type) {
      newsletterMessage.textContent = message;
      newsletterMessage.className = `egotec-newsletter-message ${type}`;
    }

    newsletterEmail.addEventListener("input", function () {
      if (newsletterMessage.classList.contains("error")) {
        newsletterMessage.textContent = "";
        newsletterMessage.className = "egotec-newsletter-message";
      }
    });
  }
});
