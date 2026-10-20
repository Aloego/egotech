// EgoTech E-commerce — Data Migration Script
// Phase 2: Data migration from Airtable + JSON to Supabase
// Run with: node scripts/migrate-data.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ── Configuration ───────────────────────────────────────────
const CONFIG = {
  // Source data files
  productJsonPath: path.join(__dirname, '../data/product.json'),
  promosJsonPath: path.join(__dirname, '../data/promos.json'),
  shippingZonesPath: path.join(__dirname, '../data/shipping-zones.json'),
  taxRatesPath: path.join(__dirname, '../data/tax-rates.json'),
  lgaTownsPath: path.join(__dirname, '../data/lga-towns.json'),
  
  // Airtable configuration (if needed for future migration)
  airtable: {
    apiKey: process.env.AIRTABLE_TOKEN,
    baseId: process.env.AIRTABLE_BASE_ID,
    productsTable: 'Products',
    merchantsTable: 'Merchants',
    ordersTable: 'Orders',
    orderItemsTable: 'OrderItems',
  },
  
  // Migration options
  options: {
    skipAirtable: true, // Set to false if you want to migrate from Airtable
    skipJson: false,    // Set to true to skip JSON migration
    dryRun: false,      // Set to true to preview changes without committing
    verbose: true,      // Log detailed progress
  },
};

// ── Helper Functions ────────────────────────────────────────
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ── Data Loaders ────────────────────────────────────────────
async function loadJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`Failed to load ${filePath}: ${error.message}`, 'error');
    return null;
  }
}

// ── Supabase Operations ────────────────────────────────────
async function upsertProducts(products) {
  log(`Upserting ${products.length} products...`);
  
  const productInserts = [];
  const migrationInserts = [];
  
  for (const product of products) {
    // Determine merchant fields (products 1-10 have no merchant info)
    const hasMerchantInfo = product.merchantName && product.merchantPhone;
    
    // Build product record
    const productRecord = {
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      currency: product.currency || 'NGN',
      description: product.description,
      short_description: product.shortDescription,
      image: product.image,
      images: product.images ? product.images.split(',').map(u => u.trim()) : [],
      rating: product.rating || 0,
      stock: product.stock || 0,
      featured: product.featured || false,
      new_arrival: product.newArrival || false,
      condition: product.condition || '',
      merchant_name: hasMerchantInfo ? product.merchantName : null,
      merchant_phone: hasMerchantInfo ? product.merchantPhone : null,
      merchant_business: hasMerchantInfo ? product.merchantBusiness : null,
      merchant_address: hasMerchantInfo ? product.merchantAddress : null,
      features: product.features || [],
      specifications: product.specifications ? JSON.stringify(product.specifications) : null,
      reviews: product.reviews ? JSON.stringify(product.reviews) : null,
    };
    
    // For migration tracking, use legacy_id (JSON product index)
    const legacyId = product.id ? String(product.id) : `json-${product.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    productInserts.push(productRecord);
    migrationInserts.push({
      legacy_id: legacyId,
      product_id: null, // Will be filled after insert
      source: 'json',
    });
  }
  
  // Insert products in batches
  const batchSize = 50;
  for (let i = 0; i < productInserts.length; i += batchSize) {
    const batch = productInserts.slice(i, i + batchSize);
    
    if (CONFIG.options.dryRun) {
      log(`[DRY RUN] Would insert ${batch.length} products`);
    } else {
      const { data, error } = await supabase
        .from('products')
        .upsert(batch, { onConflict: 'id' })
        .select('id, name');
      
      if (error) {
        log(`Error inserting product batch: ${error.message}`, 'error');
        continue;
      }
      
      // Update migration records with actual IDs
      for (let j = 0; j < batch.length; j++) {
        const product = batch[j];
        const legacyRecord = migrationInserts[i + j];
        if (data && data[j]) {
          legacyRecord.product_id = data[j].id;
        }
      }
      
      log(`✅ Inserted ${data?.length || batch.length} products`);
      await sleep(100); // Rate limiting
    }
  }
  
  // Insert migration records
  if (!CONFIG.options.dryRun && migrationInserts.length > 0) {
    const { error } = await supabase
      .from('product_migrations')
      .upsert(migrationInserts, { onConflict: 'legacy_id' });
    
    if (error) {
      log(`Error inserting migration records: ${error.message}`, 'error');
    } else {
      log(`✅ Inserted ${migrationInserts.length} migration records`);
    }
  }
  
  return productInserts.length;
}

async function upsertMerchants(products) {
  log('Upserting merchants from products...');
  
  const merchants = [];
  const seenEmails = new Set();
  
  for (const product of products) {
    if (product.merchantName && product.merchantPhone) {
      const email = product.merchantEmail || 
        `${product.merchantName.toLowerCase().replace(/\s+/g, '.')}@egotech.com`;
      
      if (!seenEmails.has(email)) {
        seenEmails.add(email);
        
        const merchant = {
          merchant_name: product.merchantName,
          merchant_email: email,
          merchant_phone: product.merchantPhone,
          merchant_business: product.merchantBusiness,
          merchant_address: product.merchantAddress,
          status: 'pending', // All merchants start as pending
        };
        
        merchants.push(merchant);
      }
    }
  }
  
  if (CONFIG.options.dryRun) {
    log(`[DRY RUN] Would upsert ${merchants.length} merchants`);
  } else {
    const { data, error } = await supabase
      .from('merchants')
      .upsert(merchants, { onConflict: 'merchant_email' })
      .select('id, merchant_name, merchant_email');
    
    if (error) {
      log(`Error upserting merchants: ${error.message}`, 'error');
    } else {
      log(`✅ Upserted ${data?.length || merchants.length} merchants`);
    }
  }
  
  return merchants.length;
}

async function upsertPromos(promos) {
  log('Upserting promo data...');
  
  if (!promos || !promos.promo) {
    log('⚠️ No promo data found', 'warn');
    return 0;
  }
  
  const promoRecord = {
    title: promos.promo.title,
    message: promos.promo.message,
    button_text: promos.promo.buttonText,
    button_link: promos.promo.buttonLink,
    image: promos.promo.image,
    updated_at: new Date().toISOString(),
  };
  
  if (CONFIG.options.dryRun) {
    log(`[DRY RUN] Would upsert promo: ${promoRecord.title}`);
  } else {
    const { error } = await supabase
      .from('promos')
      .upsert({ id: 1, ...promoRecord }, { onConflict: 'id' });
    
    if (error) {
      log(`Error upserting promo: ${error.message}`, 'error');
    } else {
      log(`✅ Upserted promo: ${promoRecord.title}`);
    }
  }
  
  return 1;
}

async function upsertShippingZones(shippingZones) {
  log('Upserting shipping zones...');
  
  if (!shippingZones || !shippingZones.shippingZones) {
    log('⚠️ No shipping zones data found', 'warn');
    return 0;
  }
  
  const zones = shippingZones.shippingZones;
  const defaultZone = shippingZones.defaultZone;
  
  const zoneInserts = [];
  
  // Insert regular zones
  for (const zone of zones) {
    const zoneRecord = {
      id: zone.id,
      name: zone.name,
      country: zone.country,
      state: zone.state,
      lgas: zone.lgas || [],
      rate: zone.rate,
      estimated_days: zone.estimatedDays,
      free_shipping_threshold: zone.freeShippingThreshold,
      created_at: new Date().toISOString(),
    };
    zoneInserts.push(zoneRecord);
  }
  
  // Insert default zone
  if (defaultZone) {
    const defaultRecord = {
      id: defaultZone.id,
      name: defaultZone.name,
      country: defaultZone.country,
      rate: defaultZone.rate,
      estimated_days: defaultZone.estimatedDays,
      free_shipping_threshold: defaultZone.freeShippingThreshold,
      created_at: new Date().toISOString(),
    };
    zoneInserts.push(defaultRecord);
  }
  
  if (CONFIG.options.dryRun) {
    log(`[DRY RUN] Would upsert ${zoneInserts.length} shipping zones`);
  } else {
    const { error } = await supabase
      .from('shipping_zones')
      .upsert(zoneInserts, { onConflict: 'id' });
    
    if (error) {
      log(`Error upserting shipping zones: ${error.message}`, 'error');
    } else {
      log(`✅ Upserted ${zoneInserts.length} shipping zones`);
    }
  }
  
  return zoneInserts.length;
}

async function upsertTaxRates(taxRates) {
  log('Upserting tax rates...');
  
  if (!taxRates || !taxRates.taxRates) {
    log('⚠️ No tax rates data found', 'warn');
    return 0;
  }
  
  const rates = taxRates.taxRates;
  const defaultRate = taxRates.defaultTaxRate;
  
  const rateInserts = [];
  
  // Insert regular rates
  for (const rate of rates) {
    const rateRecord = {
      id: rate.id,
      name: rate.name,
      country: rate.country,
      state: rate.state,
      rate: rate.rate,
      type: rate.type,
      description: rate.description,
      is_default: rate.default || false,
      created_at: new Date().toISOString(),
    };
    rateInserts.push(rateRecord);
  }
  
  // Insert default rate
  if (defaultRate) {
    const defaultRecord = {
      id: defaultRate.id,
      name: defaultRate.name,
      rate: defaultRate.rate,
      type: defaultRate.type,
      is_default: true,
      created_at: new Date().toISOString(),
    };
    rateInserts.push(defaultRecord);
  }
  
  if (CONFIG.options.dryRun) {
    log(`[DRY RUN] Would upsert ${rateInserts.length} tax rates`);
  } else {
    const { error } = await supabase
      .from('tax_rates')
      .upsert(rateInserts, { onConflict: 'id' });
    
    if (error) {
      log(`Error upserting tax rates: ${error.message}`, 'error');
    } else {
      log(`✅ Upserted ${rateInserts.length} tax rates`);
    }
  }
  
  return rateInserts.length;
}

async function upsertLgaTowns(lgaTowns) {
  log('Upserting LGA towns data...');
  
  if (!lgaTowns || !lgaTowns.towns) {
    log('⚠️ No LGA towns data found', 'warn');
    return 0;
  }
  
  const towns = lgaTowns.towns;
  const townInserts = [];
  
  for (const [lga, townList] of Object.entries(towns)) {
    for (const town of townList) {
      const townRecord = {
        lga_name: lga,
        town_name: town,
        created_at: new Date().toISOString(),
      };
      townInserts.push(townRecord);
    }
  }
  
  if (CONFIG.options.dryRun) {
    log(`[DRY RUN] Would upsert ${townInserts.length} LGA towns`);
  } else {
    const { error } = await supabase
      .from('lga_towns')
      .upsert(townInserts, { onConflict: 'lga_name', 'town_name' });
    
    if (error) {
      log(`Error upserting LGA towns: ${error.message}`, 'error');
    } else {
      log(`✅ Upserted ${townInserts.length} LGA towns`);
    }
  }
  
  return townInserts.length;
}

// ── Main Migration Function ─────────────────────────────────
async function migrate() {
  console.log('🚀 Starting EgoTech E-commerce data migration...');
  console.log('📋 Configuration:', CONFIG.options);
  
  const results = {
    products: 0,
    merchants: 0,
    promos: 0,
    shippingZones: 0,
    taxRates: 0,
    lgaTowns: 0,
  errors: [],
  };
  
  try {
    // Test Supabase connection
    log('Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('products')
      .select('count', { count: 'exact' })
      .limit(1);
    
    if (testError) {
      log(`❌ Supabase connection test failed: ${testError.message}`, 'error');
      process.exit(1);
    }
    
    log('✅ Supabase connection successful');
    
    // Load all source data
    log('📂 Loading source data files...');
    const [
      productsData,
      promosData,
      shippingZonesData,
      taxRatesData,
      lgaTownsData,
    ] = await Promise.all([
      CONFIG.options.skipJson ? null : loadJsonFile(CONFIG.productJsonPath),
      loadJsonFile(CONFIG.promosJsonPath),
      loadJsonFile(CONFIG.shippingZonesPath),
      loadJsonFile(CONFIG.taxRatesPath),
      loadJsonFile(CONFIG.lgaTownsPath),
    ]);
    
    if (!productsData) {
      log('❌ Failed to load product.json - aborting migration', 'error');
      process.exit(1);
    }
    
    // Execute migrations in dependency order
    if (!CONFIG.options.skipJson) {
      results.products = await upsertProducts(productsData);
      results.merchants = await upsertMerchants(productsData);
    }
    
    results.promos = await upsertPromos(promosData);
    results.shippingZones = await upsertShippingZones(shippingZonesData);
    results.taxRates = await upsertTaxRates(taxRatesData);
    results.lgaTowns = await upsertLgaTowns(lgaTownsData);
    
    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   Products: ${results.products}`);
    console.log(`   Merchants: ${results.merchants}`);
    console.log(`   Promos: ${results.promos}`);
    console.log(`   Shipping Zones: ${results.shippingZones}`);
    console.log(`   Tax Rates: ${results.taxRates}`);
    console.log(`   LGA Towns: ${results.lgaTowns}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (CONFIG.options.dryRun) {
      console.log('\n🔍 DRY RUN completed - no data was changed');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    
  } catch (error) {
    log(`❌ Migration failed: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// ── Execute Migration ───────────────────────────────────────
if (require.main === module) {
  migrate().catch(console.error);
}

module.exports = { migrate };