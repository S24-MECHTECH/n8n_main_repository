// ============================================================================
// SMART ROUTER NODE CODE - FÜR N8N
// Copy-Paste in deinen neuen Code-Node in n8n
// ============================================================================

const input = $input.first().json;
const geminiDecision = input; // Kommt von "Gemini Daily Decision"

// Intelligente Klassifizierung - NICHT nur adult_flags!
const routes = {
  adult_flags: [],
  images: [],
  text: [],
  merchant_quality: [],
  multi_country: [],
  gtn_ean: [],
  fallback: []
};

if (geminiDecision.products && Array.isArray(geminiDecision.products)) {
  for (const product of geminiDecision.products) {
    const action = product.action || geminiDecision.priority || 'fallback';
    
    // SMART ROUTING - ALLE KANÄLE AKTIV!
    switch(action.toLowerCase()) {
      case 'adult_flags':
      case 'adult':
        routes.adult_flags.push(product);
        break;
      case 'images':
      case 'image_fix':
      case 'image_update':
        routes.images.push(product);
        break;
      case 'text':
      case 'title':
      case 'description':
      case 'text_fix':
        routes.text.push(product);
        break;
      case 'merchant_quality':
      case 'quality':
      case 'quality_boost':
        routes.merchant_quality.push(product);
        break;
      case 'multi_country':
      case 'country':
      case 'countries':
        routes.multi_country.push(product);
        break;
      case 'gtn_ean':
      case 'ean':
      case 'gtin':
      case 'sku':
        routes.gtn_ean.push(product);
        break;
      default:
        // FALLBACK für unbekannte Typen
        routes.fallback.push({
          ...product,
          fallback_reason: `Unknown action: ${action}`,
          requires_ai_decision: true
        });
    }
  }
}

// ROUTING AUSGABE
return {
  json: {
    timestamp: new Date().toISOString(),
    gemini_decision: geminiDecision,
    routing_summary: {
      total_products: (geminiDecision.products || []).length,
      adult_flags_count: routes.adult_flags.length,
      images_count: routes.images.length,
      text_count: routes.text.length,
      merchant_quality_count: routes.merchant_quality.length,
      multi_country_count: routes.multi_country.length,
      gtn_ean_count: routes.gtn_ean.length,
      fallback_count: routes.fallback.length
    },
    routes: routes,
    ready_for_processing: true
  }
};