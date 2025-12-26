/**
 * CHECKOUT PAGE LOGIC
 * Handles checkout form, location dropdowns, shipping calculation, and order processing
 */

// Google Sheets Webhook URL (replace with your Apps Script web app URL)
const GOOGLE_SHEET_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbx7rjr_z5_GfkDnC2pggpPYMV2sh9hL6eOhpLV2DEs/devhttps://script.google.com/macros/s/AKfycbxrU_OepblGW2WzSXpu-61CJadYWewdr9lCDTSc3XnMFbmEPWZfQ-5hwq_py70Lk7Yy/exec"; // <-- Replace this value
// Constants
const CART_ITEMS_KEY = "egotec_cart_items";
const USER_LOCATION_KEY = "egotech_user_location";
const CHECKOUT_DATA_KEY = "egotech_checkout";
const LGA_TOWNS_KEY = "egotech_lga_towns";

// Global Variables
let shippingZones = [];
let taxRates = [];
let cartItems = [];
let currentLocation = null;
let lgaTowns = {}; // Stores town-LGA mappings

// Country-State Mapping
const countryStates = {
  Nigeria: [
    "Abia",
    "Abuja (FCT)",
    "Adamawa",
    "Akwa Ibom",
    "Anambra",
    "Bauchi",
    "Bayelsa",
    "Benue",
    "Borno",
    "Cross River",
    "Delta",
    "Ebonyi",
    "Edo",
    "Ekiti",
    "Enugu",
    "Gombe",
    "Imo",
    "Jigawa",
    "Kaduna",
    "Kano",
    "Katsina",
    "Kebbi",
    "Kogi",
    "Kwara",
    "Lagos",
    "Nasarawa",
    "Niger",
    "Ogun",
    "Ondo",
    "Osun",
    "Oyo",
    "Plateau",
    "Rivers",
    "Sokoto",
    "Taraba",
    "Yobe",
    "Zamfara",
  ],
  Ghana: [
    "Ashanti",
    "Brong-Ahafo",
    "Central",
    "Eastern",
    "Greater Accra",
    "Northern",
    "Upper East",
    "Upper West",
    "Volta",
    "Western",
  ],
  "Benin Republic": [
    "Alibori",
    "Atacora",
    "Atlantique",
    "Borgou",
    "Collines",
    "Couffo",
    "Donga",
    "Littoral",
    "Mono",
    "Ouémé",
    "Plateau",
    "Zou",
  ],
  Togo: ["Centrale", "Kara", "Maritime", "Plateaux", "Savanes"],
  "Ivory Coast": [
    "Abidjan",
    "Bas-Sassandra",
    "Comoé",
    "Denguélé",
    "Gôh-Djiboua",
    "Lacs",
    "Lagunes",
    "Montagnes",
    "Sassandra-Marahoué",
    "Savanes",
    "Vallée du Bandama",
    "Woroba",
    "Yamoussoukro",
    "Zanzan",
  ],
};

/**
 * Initialize checkout page on DOM load
 */
document.addEventListener("DOMContentLoaded", async function () {
  console.log("Checkout page initialized");

  // Load necessary data
  await loadShippingZones();
  await loadTaxRates();
  loadLGATowns();
  loadCartItems();
  loadSavedLocation();

  // Initialize UI
  displayOrderSummary();
  populateCountryDropdown();
  populateCityField(); // Populate city field with all LGAs
  setupEventListeners();

  // Check if cart is empty
  checkCartEmpty();
});

/**
 * Load shipping zones from JSON file
 */
async function loadShippingZones() {
  try {
    const response = await fetch("data/shipping-zones.json");
    if (!response.ok) throw new Error("Failed to load shipping zones");
    const data = await response.json();
    shippingZones = data.shippingZones || data;
    console.log("Shipping zones loaded:", shippingZones.length, "zones");
  } catch (error) {
    console.error("Error loading shipping zones:", error);
    shippingZones = [];
  }
}

/**
 * Load tax rates from JSON file
 */
async function loadTaxRates() {
  try {
    const response = await fetch("data/tax-rates.json");
    if (!response.ok) throw new Error("Failed to load tax rates");
    const data = await response.json();
    taxRates = data.taxRates || [];
    console.log("Tax rates loaded:", taxRates.length, "rates");
  } catch (error) {
    console.error("Error loading tax rates:", error);
    taxRates = [];
  }
}

/**
 * Load LGA-Towns mappings from localStorage
 */
function loadLGATowns() {
  try {
    const storedData = localStorage.getItem(LGA_TOWNS_KEY);
    if (storedData) {
      lgaTowns = JSON.parse(storedData);
      console.log(
        "LGA-Towns data loaded from localStorage:",
        Object.keys(lgaTowns).length,
        "LGAs"
      );
    } else {
      // Fetch from lga-towns.json if not in localStorage
      fetch("data/lga-towns.json")
        .then((res) => res.json())
        .then((json) => {
          // Support both {towns: {...}} and flat {...}
          lgaTowns = json.towns || json;
          localStorage.setItem(LGA_TOWNS_KEY, JSON.stringify(lgaTowns));
          console.log(
            "LGA-Towns data loaded from lga-towns.json:",
            Object.keys(lgaTowns).length,
            "LGAs"
          );
          // Optionally, refresh city field if needed
          if (typeof populateCityField === "function") populateCityField();
        })
        .catch((error) => {
          console.error("Error loading LGA-Towns from JSON file:", error);
          lgaTowns = {};
        });
    }
  } catch (error) {
    console.error("Error loading LGA-Towns data:", error);
    lgaTowns = {};
  }
}

/**
 * Save LGA-Towns mappings to localStorage
 */
function saveLGATowns() {
  try {
    localStorage.setItem(LGA_TOWNS_KEY, JSON.stringify(lgaTowns));
    console.log("LGA-Towns data saved successfully");
  } catch (error) {
    console.error("Error saving LGA-Towns data:", error);
  }
}

/**
 * Add a new town to an LGA (prevents duplicates)
 */
function addTownToLGA(lga, town) {
  if (!lga || !town) return;

  // Normalize town name (trim and capitalize first letter of each word)
  const normalizedTown = town
    .trim()
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  if (!lgaTowns[lga]) {
    lgaTowns[lga] = [];
  }

  // Check for duplicate (case-insensitive)
  const exists = lgaTowns[lga].some(
    (existingTown) =>
      existingTown.toLowerCase() === normalizedTown.toLowerCase()
  );

  if (!exists) {
    lgaTowns[lga].push(normalizedTown);
    lgaTowns[lga].sort(); // Keep towns alphabetically sorted
    saveLGATowns();
    console.log(`Added "${normalizedTown}" to ${lga}`);
    return true;
  }

  return false;
}

/**
 * Load cart items from localStorage
 */
function loadCartItems() {
  const storedItems = localStorage.getItem(CART_ITEMS_KEY);
  cartItems = storedItems ? JSON.parse(storedItems) : [];
  console.log("Cart items loaded:", cartItems.length, "items");
  console.log("Cart items data:", cartItems);
}

/**
 * Load saved user location from localStorage
 */
function loadSavedLocation() {
  const storedLocation = localStorage.getItem(USER_LOCATION_KEY);
  if (storedLocation) {
    currentLocation = JSON.parse(storedLocation);
    console.log("Saved location loaded:", currentLocation);
    populateFormWithSavedData();
  }
}

/**
 * Check if cart is empty and show appropriate UI
 */
function checkCartEmpty() {
  const emptyCheckout = document.getElementById("emptyCheckout");
  const checkoutContent = document.getElementById("checkoutContent");

  if (cartItems.length === 0) {
    emptyCheckout.style.display = "block";
    checkoutContent.style.display = "none";
  } else {
    emptyCheckout.style.display = "none";
    checkoutContent.style.display = "flex";
  }
}

/**
 * Display order summary with cart items
 */
function displayOrderSummary() {
  const summaryItemsContainer = document.getElementById("summaryItems");
  const summarySubtotal = document.getElementById("summarySubtotal");

  if (cartItems.length === 0) {
    summaryItemsContainer.innerHTML =
      '<p class="text-muted text-center">No items in cart</p>';
    summarySubtotal.textContent = formatCurrency(0);
    return;
  }

  // Render cart items
  summaryItemsContainer.innerHTML = "";
  let subtotal = 0;

  cartItems.forEach((item) => {
    // Handle both 'qty' and 'quantity' property names
    const quantity = item.quantity || item.qty || 1;
    const itemTotal = item.price * quantity;
    subtotal += itemTotal;

    console.log(
      "Processing item:",
      item.name,
      "Qty:",
      quantity,
      "Price:",
      item.price,
      "Total:",
      itemTotal
    );

    const itemHTML = `
      <div class="egotec-summary-item">
        <img src="${item.image}" alt="${
      item.name
    }" class="egotec-summary-item-image" />
        <div class="egotec-summary-item-details">
          <span class="egotec-summary-item-name">${item.name}</span>
          <span class="egotec-summary-item-meta">Qty: ${quantity}</span>
        </div>
        <span class="egotec-summary-item-price">${formatCurrency(
          itemTotal
        )}</span>
      </div>
    `;

    summaryItemsContainer.innerHTML += itemHTML;
  });

  // Update subtotal
  summarySubtotal.textContent = formatCurrency(subtotal);

  // Keep shipping as "Enter address to calculate" until location is entered
  document.getElementById("summaryShipping").textContent =
    "Enter address to calculate";

  // Tax is always ₦0.00 for now
  document.getElementById("summaryTax").textContent = "7.5%";

  // Update total (initially same as subtotal)
  document.getElementById("summaryTotal").textContent =
    formatCurrency(subtotal);
}

/**
 * Populate country dropdown
 */
function populateCountryDropdown() {
  const countrySelect = document.getElementById("country");

  // Only show Nigeria
  countrySelect.innerHTML = "";
  const option = document.createElement("option");
  option.value = "Nigeria";
  option.textContent = "Nigeria";
  option.selected = true;
  countrySelect.appendChild(option);
  // Trigger state population
  populateStateDropdown("Nigeria");
}

/**
 * Populate state dropdown based on selected country
 */
function populateStateDropdown(country) {
  const stateSelect = document.getElementById("state");
  const lgaContainer = document.getElementById("lgaContainer");

  console.log("Populating states for country:", country);

  if (!country || country === "") {
    stateSelect.innerHTML = '<option value="">Select State</option>';
    lgaContainer.style.display = "none";
    return;
  }

  // Check if country has predefined states
  if (countryStates[country]) {
    stateSelect.innerHTML = '<option value="">Select State</option>';
    countryStates[country].forEach((state) => {
      const option = document.createElement("option");
      option.value = state;
      option.textContent = state;
      stateSelect.appendChild(option);
    });
    console.log("States populated:", countryStates[country].length, "states");
  } else {
    // For other countries, show generic state input
    stateSelect.innerHTML = '<option value="">Select State/Region</option>';
    lgaContainer.style.display = "none";
    console.log("No predefined states for:", country);
  }
}

/**
 * Populate LGA dropdown based on selected state
 */
async function populateLGADropdown(state) {
  const lgaSelect = document.getElementById("lga");
  const lgaContainer = document.getElementById("lgaContainer");
  const countrySelect = document.getElementById("country");
  const selectedCountry = countrySelect.value;

  // Only show LGA for Nigerian states
  if (selectedCountry !== "Nigeria" || !state || state === "") {
    lgaContainer.style.display = "none";
    lgaSelect.removeAttribute("required");
    populateCityField(state);
    return;
  }

  // Map state names to file names (handle special case for FCT)
  const stateFileName =
    state === "Abuja (FCT)" ? "Federal Capital Territory" : state;
  const stateFilePath = `states/${stateFileName}.json`;

  try {
    // Fetch LGA data from the JSON file
    const response = await fetch(stateFilePath);
    if (!response.ok) {
      console.error(`Could not load LGAs for ${state}`);
      lgaContainer.style.display = "none";
      lgaSelect.removeAttribute("required");
      populateCityField(state);
      return;
    }

    const lgaData = await response.json();

    // Extract LGA names and sort them
    const lgaNames = lgaData.map((lga) => lga.name).sort();

    // Populate dropdown
    lgaSelect.innerHTML = '<option value="">Select LGA</option>';
    lgaNames.forEach((lga) => {
      const option = document.createElement("option");
      option.value = lga;
      option.textContent = lga;
      lgaSelect.appendChild(option);
    });

    lgaContainer.style.display = "block";
    lgaSelect.setAttribute("required", "required");

    console.log(`Loaded ${lgaNames.length} LGAs for ${state}`);

    // Also populate city field with LGAs
    populateCityField(state);
  } catch (error) {
    console.error(`Error loading LGAs for ${state}:`, error);
    lgaContainer.style.display = "none";
    lgaSelect.removeAttribute("required");
    populateCityField(state);
  }
}

/**
 * Populate city field with town suggestions based on selected LGA
 */
function populateCityField(selectedLGA = null) {
  const cityInput = document.getElementById("city");
  let cityDatalist = document.getElementById("cityList");

  // Create datalist if it doesn't exist
  if (!cityDatalist) {
    cityDatalist = document.createElement("datalist");
    cityDatalist.id = "cityList";
    cityInput.parentNode.insertBefore(cityDatalist, cityInput.nextSibling);
    cityInput.setAttribute("list", "cityList");
  }

  // Clear existing options
  cityDatalist.innerHTML = "";

  // If an LGA is selected and has towns, show them
  if (
    selectedLGA &&
    lgaTowns[selectedLGA] &&
    lgaTowns[selectedLGA].length > 0
  ) {
    lgaTowns[selectedLGA].forEach((town) => {
      const option = document.createElement("option");
      option.value = town;
      cityDatalist.appendChild(option);
    });
    // Set placeholder to example towns
    const exampleTowns = lgaTowns[selectedLGA].slice(0, 3).join(", ");
    cityInput.placeholder = `e.g. ${exampleTowns}`;
    console.log(
      `City field populated with ${lgaTowns[selectedLGA].length} towns for ${selectedLGA}`
    );
  } else {
    cityInput.placeholder = "Enter your town/city";
    console.log("City field ready for manual input");
  }
}

/**
 * Calculate and display shipping preview
 */
function calculateShippingPreview() {
  const country = document.getElementById("country").value;
  const state = document.getElementById("state").value;
  const lga = document.getElementById("lga").value;

  if (!country) {
    resetShippingPreview();
    return;
  }

  // Create location object
  const location = { country, state, lga };

  // Find matching shipping zone
  const matchedZone = findMatchingShippingZone(location);

  if (!matchedZone) {
    resetShippingPreview();
    return;
  }

  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => {
    const quantity = item.quantity || item.qty || 1;
    const price = item.price || 0;
    return sum + price * quantity;
  }, 0);

  // Calculate shipping cost (check free shipping threshold or pickup)
  const selectedShippingMethod = document.querySelector(
    'input[name="shippingMethod"]:checked'
  )?.value;
  let shippingCost = matchedZone.rate;

  if (selectedShippingMethod === "pickup") {
    shippingCost = 0; // Pickup is always free
  } else if (subtotal >= matchedZone.freeShippingThreshold) {
    shippingCost = 0;
  }

  // Set tax to zero (to be determined in future)
  const taxRate = 0;
  const taxAmount = 0;

  // Calculate total
  const total = subtotal + shippingCost + taxAmount;

  // Update UI
  document.getElementById("summaryShipping").textContent =
    shippingCost === 0 ? "FREE" : formatCurrency(shippingCost);

  // Tax is always ₦0.00 for now
  document.getElementById("summaryTax").textContent = "7.5%";
  document.getElementById("summaryTotal").textContent = formatCurrency(total);

  // Update Standard Shipping option with delivery date and price
  const standardShippingDetails = document.getElementById(
    "standardShippingDetails"
  );
  if (standardShippingDetails) {
    const costText = shippingCost === 0 ? "FREE" : formatCurrency(shippingCost);
    standardShippingDetails.textContent = `Delivery in ${matchedZone.estimatedDays} days - ${costText}`;
  }

  // Show shipping zone info
  const shippingInfo = document.getElementById("shippingInfo");
  const shippingZoneName = document.getElementById("shippingZoneName");
  const estimatedDays = document.getElementById("estimatedDays");

  shippingInfo.style.display = "block";
  shippingZoneName.textContent = matchedZone.name;
  estimatedDays.textContent = matchedZone.estimatedDays;

  // Show free shipping message if applicable
  if (shippingCost === 0 && subtotal >= matchedZone.freeShippingThreshold) {
    shippingInfo.querySelector(".alert").classList.remove("alert-info");
    shippingInfo.querySelector(".alert").classList.add("alert-success");
    shippingInfo.querySelector("p").innerHTML = `
      <small><i class="fas fa-check-circle me-1"></i>Free shipping applied! (Orders over ${formatCurrency(
        matchedZone.freeShippingThreshold
      )})</small>
    `;
  }
}

/**
 * Find matching shipping zone based on location
 */
function findMatchingShippingZone(location) {
  if (!location.country) return null;

  // Normalize Abuja (FCT) to Federal Capital Territory for shipping zone matching
  let normalizedState =
    location.state === "Abuja (FCT)"
      ? "Federal Capital Territory"
      : location.state;

  // Priority 1: Match by Country + State + LGA
  if (normalizedState && location.lga) {
    const lgaMatch = shippingZones.find(
      (zone) =>
        (zone.country === location.country ||
          zone.appliesTo?.country === location.country) &&
        (zone.state === normalizedState ||
          zone.appliesTo?.state === normalizedState) &&
        (zone.lgas?.includes(location.lga) ||
          zone.appliesTo?.lgas?.includes(location.lga))
    );
    if (lgaMatch) return lgaMatch;
  }

  // Priority 2: Match by Country + State (single state zones)
  if (normalizedState) {
    const stateMatch = shippingZones.find(
      (zone) =>
        (zone.country === location.country ||
          zone.appliesTo?.country === location.country) &&
        (zone.state === normalizedState ||
          zone.appliesTo?.state === normalizedState) &&
        !zone.lgas &&
        !zone.appliesTo?.lgas
    );
    if (stateMatch) return stateMatch;

    // Also check multi-state zones
    const multiStateMatch = shippingZones.find(
      (zone) =>
        (zone.country === location.country ||
          zone.appliesTo?.country === location.country) &&
        (zone.states?.includes(normalizedState) ||
          zone.appliesTo?.states?.includes(normalizedState))
    );
    if (multiStateMatch) return multiStateMatch;
  }

  // Priority 3: Match by Country only
  const countryMatch = shippingZones.find(
    (zone) =>
      (zone.country === location.country ||
        zone.appliesTo?.country === location.country) &&
      !zone.state &&
      !zone.states &&
      !zone.appliesTo?.state &&
      !zone.appliesTo?.states
  );
  if (countryMatch) return countryMatch;

  // Priority 4: Check international zones by countries array
  const internationalMatch = shippingZones.find((zone) =>
    zone.countries?.includes(location.country)
  );
  if (internationalMatch) return internationalMatch;

  // Priority 5: Default/International zone
  return shippingZones.find((zone) => zone.name.includes("Worldwide"));
}

/**
 * Find matching tax rate based on location
 */
function findMatchingTaxRate(location) {
  if (!location.country) return 0;

  // Try to find specific tax rate for location
  const taxRule = taxRates.find(
    (rate) =>
      rate.appliesTo?.country === location.country &&
      (!rate.appliesTo?.state || rate.appliesTo?.state === location.state)
  );

  if (taxRule) {
    return taxRule.rate;
  }

  // Return default rate (0%)
  return 0;
}

/**
 * Reset shipping preview
 */
function resetShippingPreview() {
  document.getElementById("summaryShipping").textContent =
    "Calculated at next step";
  document.getElementById("summaryTax").textContent = "7.5%";

  // Reset Standard Shipping details
  const standardShippingDetails = document.getElementById(
    "standardShippingDetails"
  );
  if (standardShippingDetails) {
    standardShippingDetails.textContent =
      "Select your location to see delivery time and cost";
  }

  const subtotal = cartItems.reduce((sum, item) => {
    const quantity = item.quantity || item.qty || 1;
    const price = item.price || 0;
    return sum + price * quantity;
  }, 0);
  document.getElementById("summaryTotal").textContent =
    formatCurrency(subtotal);

  document.getElementById("shippingInfo").style.display = "none";
}

/**
 * Populate form with saved location data
 */
function populateFormWithSavedData() {
  if (!currentLocation) return;

  // Personal information
  if (currentLocation.firstName)
    document.getElementById("firstName").value = currentLocation.firstName;
  if (currentLocation.lastName)
    document.getElementById("lastName").value = currentLocation.lastName;
  if (currentLocation.email)
    document.getElementById("email").value = currentLocation.email;
  if (currentLocation.phone)
    document.getElementById("phone").value = currentLocation.phone;

  // Address
  if (currentLocation.address)
    document.getElementById("address").value = currentLocation.address;
  if (currentLocation.city)
    document.getElementById("city").value = currentLocation.city;
  if (currentLocation.postalCode)
    document.getElementById("postalCode").value = currentLocation.postalCode;

  // Location
  if (currentLocation.country) {
    document.getElementById("country").value = currentLocation.country;
    populateStateDropdown(currentLocation.country);

    setTimeout(() => {
      if (currentLocation.state) {
        document.getElementById("state").value = currentLocation.state;
        populateLGADropdown(currentLocation.state);

        setTimeout(() => {
          if (currentLocation.lga) {
            document.getElementById("lga").value = currentLocation.lga;
          }
          calculateShippingPreview();
        }, 100);
      }
    }, 100);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Country change
  document.getElementById("country").addEventListener("change", function (e) {
    populateStateDropdown(e.target.value);
    calculateShippingPreview();
  });

  // State change
  document.getElementById("state").addEventListener("change", function (e) {
    populateLGADropdown(e.target.value);
    calculateShippingPreview();
  });

  // LGA change
  document.getElementById("lga").addEventListener("change", function (e) {
    populateCityField(e.target.value); // Show town suggestions for selected LGA
    calculateShippingPreview();
  });

  // Shipping method change (show/hide pickup location)
  document.querySelectorAll('input[name="shippingMethod"]').forEach((radio) => {
    radio.addEventListener("change", handleShippingMethodChange);
  });

  // Pickup location change
  document
    .getElementById("pickupLocation")
    .addEventListener("change", function (e) {
      displayPickupLocationDetails(e.target.value);
    });

  // State change: Show/hide pickup shipping method for Lagos only
  document.getElementById("state").addEventListener("change", function (e) {
    const shippingPickupOption = document
      .getElementById("pickup")
      .closest(".egotec-shipping-option");
    const pickupLocationContainer = document.getElementById(
      "pickupLocationContainer"
    );
    if (e.target.value === "Lagos") {
      shippingPickupOption.style.display = "block";
    } else {
      // Hide pickup shipping method and location if not Lagos
      shippingPickupOption.style.display = "none";
      pickupLocationContainer.style.display = "none";
      document.getElementById("pickupLocation").removeAttribute("required");
      document.getElementById("pickupLocation").value = "";
      document.getElementById("pickupLocationInfo").style.display = "none";
      // If pickup was selected, reset to standard
      const standardRadio = document.getElementById("standardShipping");
      if (document.getElementById("pickup").checked && standardRadio) {
        standardRadio.checked = true;
        handleShippingMethodChange({ target: standardRadio });
      }
    }
  });

  // Place Order button
  document
    .getElementById("placeOrderBtn")
    .addEventListener("click", handlePlaceOrder);

  // Form validation on input
  const form = document.getElementById("checkoutForm");
  form.addEventListener("input", function () {
    validateForm();
  });
}

/**
 * Validate form
 */
function validateForm() {
  const form = document.getElementById("checkoutForm");
  const isValid = form.checkValidity();

  const placeOrderBtn = document.getElementById("placeOrderBtn");
  placeOrderBtn.disabled = !isValid;

  return isValid;
}

/**
 * Handle shipping method change (show/hide pickup location)
 */
function handleShippingMethodChange(e) {
  const pickupLocationContainer = document.getElementById(
    "pickupLocationContainer"
  );
  const pickupLocationSelect = document.getElementById("pickupLocation");

  if (e.target.value === "pickup") {
    pickupLocationContainer.style.display = "block";
    pickupLocationSelect.setAttribute("required", "required");
  } else {
    pickupLocationContainer.style.display = "none";
    pickupLocationSelect.removeAttribute("required");
    pickupLocationSelect.value = "";
    document.getElementById("pickupLocationInfo").style.display = "none";
  }

  // Recalculate shipping cost when method changes
  calculateShippingPreview();
}

/**
 * Display pickup location details
 */
function displayPickupLocationDetails(locationValue) {
  const pickupLocationInfo = document.getElementById("pickupLocationInfo");
  const pickupLocationName = document.getElementById("pickupLocationName");
  const pickupLocationAddress = document.getElementById(
    "pickupLocationAddress"
  );
  const pickupLocationHours = document.getElementById("pickupLocationHours");

  if (!locationValue) {
    pickupLocationInfo.style.display = "none";
    return;
  }

  // Pickup locations data
  const locations = {
    "lagos-ikeja": {
      name: "Lagos - Ikeja Store",
      address: "Shop 45, Computer Village, Ikeja, Lagos State",
      hours: "Mon-Sat: 9:00 AM - 7:00 PM, Sun: 11:00 AM - 5:00 PM",
    },
    "lagos-island": {
      name: "Lagos - Victoria Island Store",
      address: "15 Adeola Odeku Street, Victoria Island, Lagos",
      hours: "Mon-Fri: 9:00 AM - 6:00 PM, Sat: 10:00 AM - 4:00 PM",
    },
    "abuja-wuse": {
      name: "Abuja - Wuse 2 Store",
      address: "Plot 234, Adetokunbo Ademola Crescent, Wuse 2, Abuja",
      hours: "Mon-Sat: 9:00 AM - 6:00 PM",
    },
  };

  const location = locations[locationValue];
  if (location) {
    pickupLocationName.textContent = location.name;
    pickupLocationAddress.textContent = location.address;
    pickupLocationHours.textContent = location.hours;
    pickupLocationInfo.style.display = "block";
  }
}

/**
 * Handle place order
 */
function handlePlaceOrder() {
  const form = document.getElementById("checkoutForm");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Collect form data
  const shippingMethodElement = document.querySelector(
    'input[name="shippingMethod"]:checked'
  );
  const shippingMethod = shippingMethodElement
    ? shippingMethodElement.value
    : "standard";

  // Defensive check for required fields
  const requiredFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "country",
    "state",
    "lga",
    "address",
    "city",
    "orderNotes",
  ];
  let missingField = null;
  for (const field of requiredFields) {
    if (!document.getElementById(field)) {
      missingField = field;
      break;
    }
  }
  if (missingField) {
    alert(`Error: Required field missing in form: ${missingField}`);
    return;
  }

  const formData = {
    firstName: document.getElementById("firstName").value.trim(),
    lastName: document.getElementById("lastName").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    country: document.getElementById("country").value,
    state: document.getElementById("state").value,
    lga: document.getElementById("lga").value,
    address: document.getElementById("address").value.trim(),
    city: document.getElementById("city").value.trim(),
    // postalCode is optional, only add if present
    ...(document.getElementById("postalCode")
      ? { postalCode: document.getElementById("postalCode").value.trim() }
      : {}),
    shippingMethod: shippingMethod,
    // pickupLocation is optional, only add if present
    ...(document.getElementById("pickupLocation")
      ? { pickupLocation: document.getElementById("pickupLocation").value }
      : {}),
    orderNotes: document.getElementById("orderNotes").value.trim(),
  };

  // Show review modal with all details
  showOrderReviewModal(formData, cartItems);
}

// Show order review modal
function showOrderReviewModal(formData, cartItems) {
  const modal = new bootstrap.Modal(
    document.getElementById("orderReviewModal")
  );
  const detailsDiv = document.getElementById("orderReviewDetails");
  // Build HTML summary
  let html = `<h6>Customer Details</h6><ul class='list-group mb-3'>`;
  for (const [key, value] of Object.entries(formData)) {
    if (value)
      html += `<li class='list-group-item d-flex justify-content-between'><span>${key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) =>
          str.toUpperCase()
        )}</span><span>${value}</span></li>`;
  }
  html += `</ul><h6>Cart Items</h6><ul class='list-group'>`;
  cartItems.forEach((item) => {
    html += `<li class='list-group-item d-flex justify-content-between'><span>${
      item.name
    } (x${item.quantity || item.qty || 1})</span><span>${formatCurrency(
      item.price * (item.quantity || item.qty || 1)
    )}</span></li>`;
  });
  html += `</ul>`;
  detailsDiv.innerHTML = html;

  // Attach confirm handler
  const confirmBtn = document.getElementById("confirmOrderBtn");
  confirmBtn.onclick = function () {
    modal.hide();
    finalizeOrder(formData, cartItems);
  };
  modal.show();
}

// Finalize order: save, send to Google Sheets, show confirmation
function finalizeOrder(formData, cartItems) {
  // Save user location to localStorage
  const userLocation = {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    phone: formData.phone,
    country: formData.country,
    state: formData.state,
    lga: formData.lga,
    address: formData.address,
    city: formData.city,
    postalCode: formData.postalCode,
  };
  localStorage.setItem(USER_LOCATION_KEY, JSON.stringify(userLocation));

  // Save town-LGA mapping if both are provided
  if (formData.lga && formData.city) {
    addTownToLGA(formData.lga, formData.city);
  }

  // Save checkout data
  const checkoutData = {
    ...formData,
    cartItems: cartItems,
    orderDate: new Date().toISOString(),
  };
  localStorage.setItem(CHECKOUT_DATA_KEY, JSON.stringify(checkoutData));

  // Send to Google Apps Script endpoint
  fetch(GOOGLE_SHEET_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(checkoutData), // checkoutData is your collected form/cart info
  })
    .then((res) => res.text())
    .then((msg) => {
      // Show success message or proceed
      showFinalConfirmation();
    })
    .catch((err) => {
      // Handle error
      showFinalConfirmation();
    });
}

// Show final confirmation message
function showFinalConfirmation() {
  // You can replace this with a nicer modal or UI
  alert("Order received! We will call to confirm your order. Thank you.");
  // Clear form fields
  const form = document.getElementById("checkoutForm");
  if (form) form.reset();
  // Clear all relevant localStorage keys to fully reset session
  localStorage.removeItem("egotec_cart_items"); // Cart contents
  localStorage.removeItem("egotech_checkout"); // Checkout form data
  localStorage.removeItem("egotech_user_location"); // Address/location for shipping
  // Optionally clear learned towns for a full reset:
  // localStorage.removeItem("egotech_lga_towns");
  // Update cart UI if available
  if (
    window.EgoTechCartDropdown &&
    window.EgoTechCartDropdown.renderCartDropdown
  ) {
    window.EgoTechCartDropdown.renderCartDropdown();
    window.EgoTechCartDropdown.updateCartCount();
  }
  // If ShoppingCart class is available, update cart badge
  if (
    window.shoppingCart &&
    typeof window.shoppingCart.saveCart === "function"
  ) {
    window.shoppingCart.saveCart();
  }
  // Update cart dropdown UI if available
  if (window.EgoTechCartDropdown) {
    window.EgoTechCartDropdown.renderCartDropdown();
    window.EgoTechCartDropdown.updateCartCount();
  }
  // Redirect to homepage after clearing session
  window.location.href = "index.html";
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
