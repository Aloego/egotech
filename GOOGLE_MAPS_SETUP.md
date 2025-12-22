# 🗺️ Google Maps Address Autocomplete Setup Guide

## ✅ What Has Been Added

The following features have been integrated into your checkout form:

### 📋 New Form Fields

1. **`full_address`** - Main autocomplete search field (users type here)
2. **`address`** - Auto-filled street address (read-only until autocomplete)
3. **`city`** - Auto-filled town/city (read-only until autocomplete)
4. **`state`** - Auto-selected from dropdown
5. **`country`** - Auto-selected from dropdown
6. **`lga`** - Auto-selected when applicable (Lagos/Abuja)
7. **`landmark`** - Optional nearby landmark field
8. **`delivery_instructions`** - Optional delivery notes
9. **`latitude`** - Hidden field (GPS coordinates)
10. **`longitude`** - Hidden field (GPS coordinates)

### 🎯 How It Works

1. User types in the **"Search Your Address"** field
2. Google Places API shows location suggestions
3. User selects a suggestion
4. Form auto-fills:
   - Street address
   - Town/City
   - State (dropdown)
   - Country (dropdown)
   - LGA (if Lagos/Abuja)
   - Coordinates (hidden)
5. Fields become editable after autocomplete
6. Success notification appears

---

## 🔑 Step-by-Step Google API Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `EgoTech Checkout`
4. Click **"Create"**

### Step 2: Enable Required APIs

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for and enable these APIs:
   - ✅ **Places API**
   - ✅ **Maps JavaScript API**
   - ✅ **Geocoding API** (optional but recommended)

### Step 3: Create API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **"API Key"**
3. Copy your API key (looks like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX`)
4. Click **"Restrict Key"** (important for security!)

### Step 4: Restrict API Key (Security)

#### Application Restrictions:

- Select **"HTTP referrers (websites)"**
- Add your domains:
  ```
  https://yourdomain.com/*
  https://www.yourdomain.com/*
  http://localhost/*
  ```

#### API Restrictions:

- Select **"Restrict key"**
- Enable only:
  - ✅ Places API
  - ✅ Maps JavaScript API
  - ✅ Geocoding API

#### Click **"Save"**

### Step 5: Add API Key to Your Website

Open `checkout.html` and find this line (around line 634):

```html
<script
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initAutocomplete"
  async
  defer
></script>
```

**Replace `YOUR_API_KEY` with your actual API key:**

```html
<script
  src="https://maps.googleapis.com/maps/api/js?key=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX&libraries=places&callback=initAutocomplete"
  async
  defer
></script>
```

### Step 6: Test the Feature

1. Open your checkout page
2. Start typing an address in **"Search Your Address"**
3. Select a suggestion from the dropdown
4. Verify all fields auto-fill correctly

---

## 💰 Pricing Information

### Google Maps API Pricing (as of 2025)

- **Places API Autocomplete**: $2.83 per 1,000 requests
- **Maps JavaScript API**: Free (when used with Places)
- **Free Tier**: $200 monthly credit (≈70,000 autocompletes/month free)

### Tips to Stay Within Free Tier:

1. ✅ Restrict API key to your domain only
2. ✅ Enable billing alerts at $150
3. ✅ Set daily request limits (optional)
4. ✅ Use autocomplete session tokens (already implemented)

---

## 🔧 Troubleshooting

### Issue: "This page can't load Google Maps correctly"

This is the most common error. Here's how to fix it:

**Step 1: Check if billing is enabled**

1. Go to [Google Cloud Console - Billing](https://console.cloud.google.com/billing)
2. Make sure your project has billing enabled
3. ⚠️ **Google Maps API requires a billing account** (but you get $200 free credit monthly)
4. Add a credit/debit card to enable billing

**Step 2: Verify API Key Restrictions**

1. Go to [API Credentials](https://console.cloud.google.com/apis/credentials)
2. Click on your API key
3. Check **Application restrictions**:
   - If testing locally: Select **"None"** temporarily
   - For production: Select **"HTTP referrers"** and add:
     ```
     http://localhost/*
     http://localhost:*/*
     http://127.0.0.1/*
     http://127.0.0.1:*/*
     https://yourdomain.com/*
     ```

**Step 3: Verify API Restrictions**

1. Scroll to **API restrictions**
2. Select **"Restrict key"**
3. Make sure these are checked:
   - ✅ **Places API (New)** ← Use "New" version, not legacy
   - ✅ **Maps JavaScript API**
   - ✅ **Geocoding API**
4. Click **Save**

**Step 4: Enable Required APIs**

1. Go to [APIs & Services → Library](https://console.cloud.google.com/apis/library)
2. Search and enable:
   - **Places API (New)** - IMPORTANT: Use the NEW version
   - **Maps JavaScript API**
   - **Geocoding API**

**Step 5: Wait and Clear Cache**

1. Wait 5-10 minutes after making changes
2. Clear browser cache (Ctrl+Shift+Delete)
3. Open checkout page in incognito/private window
4. Hard refresh (Ctrl+F5)

**Quick Fix for Testing:**
Temporarily remove all restrictions:

1. API Key → Application restrictions → **None**
2. API restrictions → **Don't restrict key**
3. Save and wait 5 minutes
4. **Remember to add restrictions back before going live!**

### Issue: "Google is not defined" error

**Solution**: Make sure the Google Maps script loads before `address-autocomplete.js`

Check script order in `checkout.html`:

```html
1. bootstrap.min.js 2. cart-dropdown.js 3. Google Maps API (with callback) 4.
address-autocomplete.js ← Must be after Google Maps 5. checkout.js
```

### Issue: Autocomplete dropdown not showing

**Solutions**:

1. Check browser console for API errors
2. Verify API key is correct
3. Ensure Places API is enabled
4. Check domain restrictions match your URL

### Issue: Address fields not auto-filling

**Solution**: Open browser console and check for errors in `fillInAddress()` function

### Issue: "This API project is not authorized to use this API"

**Solution**:

1. Go to Google Cloud Console
2. Enable **Places API (New)** and **Maps JavaScript API**
3. Wait 5 minutes for changes to propagate

### Issue: "RefererNotAllowedMapError"

**Solution**:

1. Your API key has HTTP referrer restrictions
2. Add your localhost URL: `http://localhost/*`
3. For Live Server: `http://127.0.0.1:*/*`
4. For file protocol: `file:///*`

---

## 📱 Mobile Optimization

The autocomplete feature is fully mobile-responsive:

- ✅ Touch-friendly dropdown
- ✅ Full-width on small screens
- ✅ Optimized tap targets
- ✅ Smooth animations
- ✅ Auto-scrolling to fields

---

## 🧪 Testing Checklist

- [ ] API key added and working
- [ ] Autocomplete suggestions appear when typing
- [ ] Selecting address fills all fields
- [ ] State dropdown updates correctly
- [ ] Country dropdown updates correctly
- [ ] LGA dropdown shows for Lagos/Abuja
- [ ] Coordinates stored in hidden fields
- [ ] Success notification appears
- [ ] Fields become editable after autocomplete
- [ ] Works on mobile devices
- [ ] Manual entry still possible

---

## 📄 Files Modified

1. **`checkout.html`** - Added autocomplete field and script tags
2. **`js/address-autocomplete.js`** - NEW: Autocomplete logic
3. **`css/checkout.css`** - Added autocomplete styling

---

## 🔒 Security Best Practices

1. **Never commit API keys to Git**

   - Use environment variables in production
   - Add `.env` file to `.gitignore`

2. **Restrict API key properly**

   - HTTP referrer restrictions
   - API restrictions
   - Daily quotas

3. **Monitor API usage**
   - Set up billing alerts
   - Review usage weekly
   - Check for unusual spikes

---

## 🎉 You're All Set!

Your checkout form now has professional address autocomplete powered by Google Maps!

If you encounter any issues, check the browser console for error messages and refer to the troubleshooting section above.

### Need Help?

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Places Autocomplete Guide](https://developers.google.com/maps/documentation/javascript/place-autocomplete)
