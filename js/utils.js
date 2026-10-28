
// ============================================
// EGOTECH SHARED UTILITIES
// ============================================
// This file contains shared utility functions
// used across multiple pages. Load it before
// any other EgoTech JS file.
// ============================================

const EgoTechUtils = {

  // Format amount as Nigerian Naira
  formatCurrency(amount) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  

  // Generate condition badge only (for product cards)
getConditionBadge(condition) {
  if (!condition) return "";
  const classes = {
    "NEW": "egotec-condition-new",
    "USED": "egotec-condition-used",
    "REFURBISHED": "egotec-condition-refurbished"
  };
  const cls = classes[condition.toUpperCase()] || "";
  if (!cls) return "";
  return `<span class="egotec-condition-badge ${cls}">${condition}</span>`;
},

// Generate condition badge + notice (for product details and quick view)
getConditionBadgeWithNotice(condition) {
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

  // ------------------------------------------------------------
  // BUY NOW: ask for the buyer's phone number, then open WhatsApp
  // ------------------------------------------------------------

  // All "Buy Now" clicks go to this single WhatsApp number.
  // Change it here only (international format, digits only, no + or spaces).
  WHATSAPP_NUMBER: "2348105031964",

  // The server address that saves each inquiry
  INQUIRY_URL: "https://egotech.onrender.com/api/inquiry",

  // Turns what a buyer typed into digits with a country code.
  //  - A number starting with 0 is treated as Nigerian (0803... becomes 234803...)
  //  - Any other number must already include its country code (233... for Ghana)
  // Returns { ok: true, phone } or { ok: false, message }.
  normalizeBuyerPhone(raw) {
    const typed = String(raw || "").trim();
    let digits = typed.replace(/[^0-9]/g, "");

    if (!digits) {
      return { ok: false, message: "Enter your phone number to continue." };
    }

    if (digits.startsWith("00")) {
      digits = digits.slice(2); // 00234... is the same as +234...
    } else if (digits.startsWith("0") && !typed.startsWith("+")) {
      if (digits.length !== 11) {
        return { ok: false, message: "A Nigerian number has 11 digits, like 0803 123 4567." };
      }
      digits = "234" + digits.slice(1);
    }

    if (digits.length < 11 || digits.length > 15) {
      return {
        ok: false,
        message: "Check your number and include the country code, like 233 for Ghana or 234 for Nigeria.",
      };
    }

    return { ok: true, phone: digits };
  },

  // Saves the inquiry and opens WhatsApp. Call this only after the
  // buyer has given a valid phone number (buyNowInquiry does that).
  sendInquiry(product, quantity, buyerPhone) {
    // Save the inquiry on the server. If this fails, the buyer can still
    // reach you on WhatsApp, so it never blocks them.
    fetch(EgoTechUtils.INQUIRY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: quantity,
        buyerPhone: buyerPhone,
      }),
    }).catch((err) => console.error("Inquiry logging failed:", err));

    // Link to the product so you know exactly what is being asked about
    const productLink = `${window.location.origin}${window.location.pathname.includes("/") ? window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1) : ""}product-details.html?id=${product.id}`;

    const message = `Hi, I'm interested in buying *${product.name}* (₦${Number(product.price).toLocaleString()}) ${quantity > 1 ? `x${quantity} ` : ""}from Techpoint. Is it available?\n\nProduct link: ${productLink}`;

    window.open(
      `https://wa.me/${EgoTechUtils.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  },

  // Called by every "Buy Now" button. Shows a small pop-up that asks for
  // the buyer's phone number. WhatsApp only opens once a valid number is given.
  buyNowInquiry(product, quantity = 1) {
    if (document.getElementById("egotec-phone-modal")) return; // already open

    // Pop-up styles, added once
    if (!document.getElementById("egotec-phone-modal-styles")) {
      const style = document.createElement("style");
      style.id = "egotec-phone-modal-styles";
      style.textContent = `
        .egotec-pm-overlay { position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(17, 17, 17, 0.6); }
        .egotec-pm-dialog { width: 100%; max-width: 400px; padding: 24px; border-radius: 4px; background: #ffffff; color: #111111; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); }
        .egotec-pm-dialog h2 { margin: 0 0 6px; font: 700 1.4rem/1.2 Georgia, serif; }
        .egotec-pm-product { margin: 0 0 16px; color: #686868; font-size: 0.95rem; }
        .egotec-pm-dialog label { display: block; margin-bottom: 6px; font-weight: 700; }
        .egotec-pm-input { width: 100%; min-height: 46px; padding: 0 12px; border: 1px solid #686868; border-radius: 4px; font-size: 16px; }
        .egotec-pm-input[aria-invalid="true"] { border-color: #b3261e; }
        .egotec-pm-hint { margin: 6px 0 0; color: #686868; font-size: 0.85rem; }
        .egotec-pm-error { margin: 10px 0 0; padding: 8px 10px; border-left: 4px solid #b3261e; background: #fdeceb; color: #7a1812; font-size: 0.9rem; }
        .egotec-pm-actions { display: flex; gap: 10px; margin-top: 18px; }
        .egotec-pm-btn { min-height: 46px; padding: 0 16px; border: 1px solid #111111; border-radius: 4px; background: #ffffff; color: #111111; font-size: 1rem; cursor: pointer; }
        .egotec-pm-btn-primary { flex: 1; border-color: #503aa8; background: #503aa8; color: #ffffff; font-weight: 700; }
        .egotec-pm-btn-primary:hover { background: #432f8f; }
        .egotec-pm-dialog :focus-visible { outline: 3px solid #503aa8; outline-offset: 2px; }
        .egotec-pm-btn-primary:focus-visible { outline-color: #111111; }
      `;
      document.head.appendChild(style);
    }

    // Small helper that builds elements without treating text as HTML
    const make = (tag, attrs = {}, ...kids) => {
      const node = document.createElement(tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      kids.forEach((kid) => node.append(kid));
      return node;
    };

    const returnFocusTo = document.activeElement;

    // Remember the number used last time on this device (if the browser allows)
    let savedPhone = "";
    try { savedPhone = localStorage.getItem("egotech_buyer_phone") || ""; } catch (e) { /* ignore */ }

    const input = make("input", {
      id: "egotec-pm-phone",
      class: "egotec-pm-input",
      type: "tel",
      inputmode: "tel",
      autocomplete: "tel",
      placeholder: "0803 123 4567",
      "aria-describedby": "egotec-pm-hint",
      required: "",
    });
    input.value = savedPhone;

    const error = make("div", { class: "egotec-pm-error", role: "alert" });
    error.hidden = true;

    const submit = make("button", { type: "submit", class: "egotec-pm-btn egotec-pm-btn-primary" }, "Continue to WhatsApp");
    const cancel = make("button", { type: "button", class: "egotec-pm-btn" }, "Cancel");

    const form = make(
      "form",
      { novalidate: "" },
      make("label", { for: "egotec-pm-phone" }, "Your phone number"),
      input,
      make("p", { id: "egotec-pm-hint", class: "egotec-pm-hint" }, "We'll use it to send you updates on this order."),
      error,
      make("div", { class: "egotec-pm-actions" }, submit, cancel)
    );

    const dialog = make(
      "div",
      { class: "egotec-pm-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "egotec-pm-title" },
      make("h2", { id: "egotec-pm-title" }, "Before we open WhatsApp"),
      make("p", { class: "egotec-pm-product" }, `${product.name}${quantity > 1 ? ` × ${quantity}` : ""}`),
      form
    );

    const overlay = make("div", { id: "egotec-phone-modal", class: "egotec-pm-overlay" }, dialog);

    const close = () => {
      overlay.remove();
      if (returnFocusTo && returnFocusTo.focus) returnFocusTo.focus();
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = EgoTechUtils.normalizeBuyerPhone(input.value);

      if (!result.ok) {
        error.textContent = result.message;
        error.hidden = false;
        input.setAttribute("aria-invalid", "true");
        input.focus();
        return;
      }

      try { localStorage.setItem("egotech_buyer_phone", input.value.trim()); } catch (e) { /* ignore */ }

      EgoTechUtils.sendInquiry(product, quantity, result.phone);
      close();
    });

    input.addEventListener("input", () => {
      error.hidden = true;
      input.removeAttribute("aria-invalid");
    });

    cancel.addEventListener("click", close);

    // Clicking the dark area outside the box closes it
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay) close();
    });

    // Escape closes it; Tab stays inside the box
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key === "Tab") {
        const stops = [input, submit, cancel];
        const first = stops[0];
        const last = stops[stops.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    document.body.appendChild(overlay);
    input.focus();
  },

};