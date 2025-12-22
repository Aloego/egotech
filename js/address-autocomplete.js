/**
 * GOOGLE MAPS ADDRESS AUTOCOMPLETE
 * Handles address autocomplete using Google Places API
 */

let autocomplete;
let addressField;

/**
 * Initialize Google Maps Autocomplete
 * This function is called by the Google Maps API callback
 */
function initAutocomplete() {
  addressField = document.getElementById("full_address");

  if (!addressField) {
    console.warn("Address field not found");
    return;
  }

  // Create autocomplete instance
  autocomplete = new google.maps.places.Autocomplete(addressField, {
    types: ["address"],
    fields: ["address_components", "geometry", "formatted_address", "name"],
  });

  // Set bias to Nigeria by default
  autocomplete.setComponentRestrictions({
    country: ["ng", "gh", "bj", "tg", "ci"], // Nigeria, Ghana, Benin, Togo, Ivory Coast
  });

  // Listen for place selection
  autocomplete.addListener("place_changed", fillInAddress);

  console.log("Google Maps Autocomplete initialized");
}

/**
 * Fill in address fields when user selects a place
 */
function fillInAddress() {
  const place = autocomplete.getPlace();

  if (!place.geometry) {
    console.log("No details available for input: '" + place.name + "'");
    return;
  }

  console.log("Place selected:", place);

  // Clear previous values
  document.getElementById("address").value = "";
  document.getElementById("city").value = "";
  document.getElementById("state").value = "";
  document.getElementById("country").value = "";

  // Extract address components
  let streetNumber = "";
  let route = "";
  let locality = "";
  let city = "";
  let lga = "";
  let state = "";
  let postalCode = "";
  let country = "";

  // Parse address components
  for (const component of place.address_components) {
    const componentType = component.types[0];

    switch (componentType) {
      case "street_number":
        streetNumber = component.long_name;
        break;
      case "route":
        route = component.long_name;
        break;
      case "locality":
        locality = component.long_name;
        break;
      case "administrative_area_level_2":
        // This is typically the LGA in Nigeria
        lga = component.long_name;
        break;
      case "administrative_area_level_1":
        // This is the state
        state = component.long_name;
        break;
      case "country":
        country = component.long_name;
        break;
      case "postal_code":
        postalCode = component.long_name;
        break;
      case "sublocality_level_1":
      case "sublocality":
        // Additional locality info
        if (!city) city = component.long_name;
        break;
    }
  }

  // Combine street number and route for full address
  const streetAddress = [streetNumber, route].filter(Boolean).join(" ");

  // Use locality, LGA, or city - whichever is available
  const townCity = locality || lga || city || "";

  // Fill in the form fields
  document.getElementById("address").value =
    streetAddress || place.formatted_address;
  document.getElementById("city").value = townCity;

  // Update state dropdown
  const stateSelect = document.getElementById("state");
  if (state) {
    // Try to match the state with our dropdown options
    const stateOption = Array.from(stateSelect.options).find(
      (option) =>
        option.value.toLowerCase().includes(state.toLowerCase()) ||
        state.toLowerCase().includes(option.value.toLowerCase())
    );

    if (stateOption) {
      stateSelect.value = stateOption.value;
      // Trigger change event to populate LGA
      stateSelect.dispatchEvent(new Event("change"));
    }
  }

  // Update country dropdown
  const countrySelect = document.getElementById("country");
  if (country) {
    const countryOption = Array.from(countrySelect.options).find(
      (option) =>
        option.value.toLowerCase().includes(country.toLowerCase()) ||
        country.toLowerCase().includes(option.value.toLowerCase())
    );

    if (countryOption) {
      countrySelect.value = countryOption.value;
      // Trigger change event to populate states
      countrySelect.dispatchEvent(new Event("change"));
    }
  }

  // Store coordinates in hidden fields
  if (place.geometry.location) {
    document.getElementById("latitude").value = place.geometry.location.lat();
    document.getElementById("longitude").value = place.geometry.location.lng();
  }

  // If LGA was found, try to select it in the LGA dropdown
  if (lga) {
    setTimeout(() => {
      const lgaSelect = document.getElementById("lga");
      if (lgaSelect && lgaSelect.style.display !== "none") {
        const lgaOption = Array.from(lgaSelect.options).find(
          (option) =>
            option.value.toLowerCase().includes(lga.toLowerCase()) ||
            lga.toLowerCase().includes(option.value.toLowerCase())
        );

        if (lgaOption) {
          lgaSelect.value = lgaOption.value;
          lgaSelect.dispatchEvent(new Event("change"));
        }
      }
    }, 500);
  }

  // Make readonly fields editable after autocomplete
  document.getElementById("address").removeAttribute("readonly");
  document.getElementById("city").removeAttribute("readonly");

  // Show success notification
  showAddressNotification("Address auto-filled successfully!");
}

/**
 * Show notification for address autocomplete
 */
function showAddressNotification(message) {
  // Check if notification element exists
  let notification = document.getElementById("addressNotification");

  if (!notification) {
    // Create notification element
    notification = document.createElement("div");
    notification.id = "addressNotification";
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
  }

  notification.textContent = message;
  notification.style.display = "block";

  // Auto-hide after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      notification.style.display = "none";
    }, 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
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
      transform: translateX(400px);
      opacity: 0;
    }
  }

  /* Style Google autocomplete dropdown for mobile */
  .pac-container {
    z-index: 9999 !important;
    font-family: inherit;
    border-radius: 8px;
    margin-top: 5px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .pac-item {
    padding: 10px 15px;
    cursor: pointer;
    border-top: 1px solid #e9ecef;
  }

  .pac-item:hover {
    background-color: #f8f9ff;
  }

  .pac-icon {
    margin-top: 5px;
  }

  .pac-item-query {
    font-weight: 600;
    color: #2c3e50;
  }

  /* Mobile responsive */
  @media (max-width: 767px) {
    .pac-container {
      width: calc(100vw - 40px) !important;
      left: 20px !important;
    }
    
    #addressNotification {
      right: 10px;
      left: 10px;
      top: 10px;
    }
  }

  /* Autocomplete input focus */
  #full_address:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.15);
  }
`;
document.head.appendChild(style);

// Handle API load errors
window.gm_authFailure = function () {
  console.error(
    "Google Maps API authentication failed. Please check your API key."
  );

  const errorMsg = `
⚠️ GOOGLE MAPS API ERROR ⚠️

Common causes:
1. Billing not enabled - Google Maps requires a billing account
2. Wrong APIs enabled - Enable "Places API (New)" and "Maps JavaScript API"
3. API key restrictions - Temporarily set to "None" for testing
4. API key invalid - Verify the key is correct

Next steps:
1. Go to: https://console.cloud.google.com/billing
2. Enable billing (you get $200 free credit monthly)
3. Go to: https://console.cloud.google.com/apis/library
4. Enable "Places API (New)" and "Maps JavaScript API"
5. Go to: https://console.cloud.google.com/apis/credentials
6. Set Application restrictions to "None" temporarily
7. Set API restrictions to "Don't restrict key" temporarily
8. Wait 5 minutes and refresh this page
`;

  console.error(errorMsg);
  alert(
    "Address autocomplete is unavailable. Please enter your address manually.\n\nCheck browser console (F12) for detailed error information."
  );

  // Make fields editable so users can enter manually
  const addressField = document.getElementById("address");
  const cityField = document.getElementById("city");
  if (addressField) addressField.removeAttribute("readonly");
  if (cityField) cityField.removeAttribute("readonly");
};
