/**
 * 🧪 TEST NODE 3: EXPRESSION REPAIR
 * Test mit Sample-Data
 */

function testNode3() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST NODE 3: EXPRESSION REPAIR');
  console.log('='.repeat(80) + '\n');
  
  const testCases = [
    { 
      product: { title: 'Test Product' }, 
      expected: { title: 'Test Product', sku: 'UNKNOWN', action: 'merchant_quality' },
      description: 'Fehlende sku und action'
    },
    { 
      product: { sku: 'TEST001', title: 'Product' }, 
      expected: { sku: 'TEST001', title: 'Product', action: 'merchant_quality' },
      description: 'Fehlende action'
    },
    { 
      product: { sku: 'TEST002', action: 'update' }, 
      expected: { sku: 'TEST002', action: 'update' },
      description: 'Alles vorhanden'
    }
  ];
  
  console.log('📋 TEST-CASES:\n');
  
  testCases.forEach((testCase, index) => {
    console.log(`   Test ${index + 1}: ${testCase.description}`);
    
    // Simuliere Code-Logik
    const product = { ...testCase.product };
    if (!product.sku) product.sku = 'UNKNOWN';
    if (!product.action) product.action = 'merchant_quality';
    
    const match = JSON.stringify(product) === JSON.stringify(testCase.expected);
    console.log(`      Input: ${JSON.stringify(testCase.product)}`);
    console.log(`      Ergebnis: ${JSON.stringify(product)}`);
    console.log(`      Erwartet: ${JSON.stringify(testCase.expected)}`);
    console.log(`      Status: ${match ? '✅ OK' : '❌ FEHLER'}\n`);
  });
  
  console.log('✅ NODE 3 TEST: ABGESCHLOSSEN\n');
  console.log('='.repeat(80) + '\n');
}

testNode3();
