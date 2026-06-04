  // ── Configuration ──
      const BACKEND_URL = "https://egotech.onrender.com";

      // ── Uploaded images array ──
let uploadedImages = [];

async function uploadSingleImage(file) {
  if (file.size > 5 * 1024 * 1024) {
    showError(`${file.name} is too large. Each image must be under 5MB.`);
    return null;
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "rezukj30");

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/dahdwxecx/image/upload",
    { method: "POST", body: formData }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Upload failed");
  return data.secure_url;
}

function renderImagePreviews() {
  const container = document.getElementById("imagePreviewContainer");
  const addMoreBtn = document.getElementById("addMoreImagesBtn");

  container.innerHTML = "";

  uploadedImages.forEach((url, index) => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:relative; display:inline-block;";
    wrapper.innerHTML = `
      <img src="${url}" alt="Image ${index + 1}"
        style="width:80px; height:80px; object-fit:cover; border-radius:8px;
               border:2px solid ${index === 0 ? 'var(--Accent-color3)' : '#ddd'};" />
      ${index === 0 ? '<span style="position:absolute;top:-6px;left:-6px;background:var(--Accent-color3);color:#fff;font-size:0.65rem;padding:2px 6px;border-radius:50px;">Main</span>' : ''}
      <button type="button" onclick="removeUploadedImage(${index})"
        style="position:absolute;top:-6px;right:-6px;background:#dc3545;color:#fff;
               border:none;border-radius:50%;width:20px;height:20px;font-size:0.7rem;
               cursor:pointer;display:flex;align-items:center;justify-content:center;">
        <i class="fas fa-times"></i>
      </button>
    `;
    container.appendChild(wrapper);
  });

  document.getElementById("uploadedImageUrl").value = uploadedImages[0] || "";
  document.getElementById("uploadedImageUrls").value = uploadedImages.join(",");
  if (addMoreBtn) addMoreBtn.style.display = uploadedImages.length > 0 ? "inline-flex" : "none";
}

function removeUploadedImage(index) {
  uploadedImages.splice(index, 1);
  renderImagePreviews();
}

      // ── Image mode switching ──
      function switchImageMode(mode) {
        const uploadMode = document.getElementById("uploadMode");
        const urlMode = document.getElementById("urlMode");
        const uploadToggle = document.getElementById("uploadToggle");
        const urlToggle = document.getElementById("urlToggle");

        if (mode === "upload") {
          uploadMode.style.display = "block";
          urlMode.style.display = "none";
          uploadToggle.classList.add("active");
          urlToggle.classList.remove("active");
        } else {
          uploadMode.style.display = "none";
          urlMode.style.display = "block";
          uploadToggle.classList.remove("active");
          urlToggle.classList.add("active");
        }
      }

  
// ── Image upload handler ──
async function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const uploadArea = document.getElementById("uploadArea");
  const addMoreBtn = document.getElementById("addMoreImagesBtn");

  if (addMoreBtn) {
    addMoreBtn.disabled = true;
    addMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Uploading...';
  }

  try {
    const url = await uploadSingleImage(file);
    if (!url) return;
    uploadedImages.push(url);
    renderImagePreviews();
  } catch (err) {
    showError("Failed to upload image: " + err.message);
  } finally {
    if (addMoreBtn) {
      addMoreBtn.disabled = false;
      addMoreBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Add Another Image';
    }
  }
}

      // ── Remove image ──
      function removeImage(type) {
        document.getElementById("imageFile").value = "";
        document.getElementById("mainImagePreview").style.display = "none";
        document.getElementById("mainImagePreviewImg").src = "";
      }

      // ── Preview image URL ──
      function previewImageUrl() {
        const url = document.getElementById("imageUrl").value.trim();
        const previewImg = document.getElementById("urlImagePreviewImg");
        if (url) {
          previewImg.src = url;
          previewImg.style.display = "block";
          previewImg.onerror = function () {
            previewImg.style.display = "none";
          };
        } else {
          previewImg.style.display = "none";
        }
      }

      // ── Character counters ──
      document.getElementById("productShortDesc").addEventListener("input", function () {
        document.getElementById("shortDescCount").textContent = this.value.length;
      });

      document.getElementById("productDesc").addEventListener("input", function () {
        document.getElementById("descCount").textContent = this.value.length;
      });

      // ── Show/hide error ──
      function showError(message) {
        const errorEl = document.getElementById("formError");
        document.getElementById("formErrorText").textContent = message;
        errorEl.style.display = "block";
        errorEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      function hideError() {
        document.getElementById("formError").style.display = "none";
      }

      

      // Get main image value — URL only for now

function getMainImage() {
  const uploadToggle = document.getElementById("uploadToggle");
  if (uploadToggle.classList.contains("active")) {
    return uploadedImages[0] || "";
  } else {
    return document.getElementById("imageUrl").value.trim();
  }
}

function getAllImages() {
  const uploadToggle = document.getElementById("uploadToggle");
  if (uploadToggle.classList.contains("active")) {
    return uploadedImages.join(",");
  } else {
    const mainUrl = document.getElementById("imageUrl").value.trim();
    const additionalUrls = document.getElementById("additionalImages").value.trim();
    return additionalUrls ? `${mainUrl},${additionalUrls}` : mainUrl;
  }
}     

// ── Reset form ──

  function resetForm() {
    document.getElementById("merchantForm").reset();
    document.getElementById("formSuccess").style.display = "none";
    document.getElementById("merchantForm").style.display = "block";
    uploadedImages = [];
    document.getElementById("imagePreviewContainer").innerHTML = "";
    document.getElementById("uploadedImageUrl").value = "";
    document.getElementById("uploadedImageUrls").value = "";
    const addMoreBtn = document.getElementById("addMoreImagesBtn");
    if (addMoreBtn) addMoreBtn.style.display = "none";

  document.getElementById("shortDescCount").textContent = "0";
  document.getElementById("descCount").textContent = "0";
  switchImageMode("upload");

  // Reset submit button state
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = false;
  submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Product for Review';

  // Hide any error messages
  hideError();
}

// Switch to URL mode automatically
switchImageMode("url");

      // ── Form submission ──
      document.getElementById("merchantForm").addEventListener("submit", async function (e) {
        e.preventDefault();
        hideError();

        // Validate form
        if (!this.checkValidity()) {
          this.reportValidity();
          return;
        }

        // Get main image
        const mainImage = getMainImage() || "https://via.placeholder.com/300x300?text=No+Image";

        // Disable submit button
        const submitBtn = document.getElementById("submitBtn");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';

        // Build payload
        const payload = {
          name: document.getElementById("productName").value.trim(),
          brand: document.getElementById("productBrand").value.trim(),
          category: document.getElementById("productCategory").value,
          price: parseFloat(document.getElementById("productPrice").value),
          // currency: document.getElementById("productCurrency").value,
          currency: "NGN",
          stock: parseInt(document.getElementById("productStock").value),
          condition: document.getElementById("productCondition").value,
          shortDescription: document.getElementById("productShortDesc").value.trim(),
          description: document.getElementById("productDesc").value.trim(),
          image: mainImage,
          images: getAllImages(),
          merchantName: document.getElementById("merchantName").value.trim(),
          merchantEmail: document.getElementById("merchantEmail").value.trim(),
          merchantPhone: document.getElementById("merchantPhone").value.trim(),
          merchantBusiness: document.getElementById("merchantBusiness").value.trim(),
          merchantAddress: document.getElementById("merchantAddress").value.trim(),

        };

        console.log("Submitting payload:", payload);
        console.log("Sending to:", `${BACKEND_URL}/api/products`);

        try {
          const response = await fetch(`${BACKEND_URL}/api/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Submission failed");
          }

          // Show success
          document.getElementById("merchantForm").style.display = "none";
          document.getElementById("formSuccess").style.display = "block";
          document.getElementById("formSuccess").scrollIntoView({ behavior: "smooth" });

        } catch (err) {
          showError("Failed to submit product. Please try again. Error: " + err.message);
          // Show timeout warning after 30 seconds
const timeoutWarning = setTimeout(() => {
  showError("This is taking longer than expected. Please wait or try again.");
}, 30000);
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Submit Product for Review';
        }
      });

      // ── Drag and drop support ──
      const uploadArea = document.getElementById("uploadArea");

      uploadArea.addEventListener("dragover", function (e) {
        e.preventDefault();
        this.style.borderColor = "var(--Accent-color3)";
        this.style.background = "rgba(80,58,168,0.08)";
      });

      uploadArea.addEventListener("dragleave", function () {
        this.style.borderColor = "#ddd";
        this.style.background = "var(--Accent-color5)";
      });

      uploadArea.addEventListener("drop", function (e) {
        e.preventDefault();
        this.style.borderColor = "#ddd";
        this.style.background = "var(--Accent-color5)";
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
          const input = document.getElementById("imageFile");
          const dt = new DataTransfer();
          dt.items.add(file);
          input.files = dt.files;
          handleImageUpload({ target: { files: [file] } }, "main");
        }
      });
