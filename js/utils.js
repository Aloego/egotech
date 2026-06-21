
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

  // Open WhatsApp inquiry for a product, with phone/SMS fallback
async buyNowInquiry(product, quantity = 1) {
  // Log inquiry to Airtable (fire and forget)
  fetch("https://egotech.onrender.com/api/inquiry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: quantity,
      merchantName: product.merchantName || "",
      merchantPhone: product.merchantPhone || "",
      merchantBusiness: product.merchantBusiness || "",
      merchantAddress: product.merchantAddress || "",
    }),
  }).catch((err) => console.error("Inquiry logging failed:", err));

  // // Build WhatsApp message
  // const message = `Hi, I'm interested in buying *${product.name}* (₦${Number(product.price).toLocaleString()}) ${quantity > 1 ? `x${quantity} ` : ""}from EgoTech. Is it available?`;
  // const encodedMessage = encodeURIComponent(message);


  // Build product link so vendor knows exactly which product is being asked about
  const productLink = `${window.location.origin}${window.location.pathname.includes("/") ? window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1) : ""}product-details.html?id=${product.id}`;

  // Build WhatsApp message
  const message = `Hi, I'm interested in buying *${product.name}* (₦${Number(product.price).toLocaleString()}) ${quantity > 1 ? `x${quantity} ` : ""}from Techpoint. Is it available?\n\nProduct link: ${productLink}`;
  const encodedMessage = encodeURIComponent(message);



  // Normalize phone number to international format
  let phone = (product.merchantPhone || "").replace(/[^0-9]/g, "");
  if (phone.startsWith("0")) {
    phone = "234" + phone.slice(1);
  }

  if (phone) {
    // Try WhatsApp first
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank");
  } else {
    alert("Sorry, contact details for this merchant are not available.");
  }
},

};