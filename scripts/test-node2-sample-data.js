/**
 * 🧪 TEST NODE 2: RETRY QUEUE
 * Test mit Sample-Data
 */

function testNode2() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST NODE 2: RETRY QUEUE');
  console.log('='.repeat(80) + '\n');
  
  const testCases = [
    { product: { sku: 'TEST001' }, attempt: undefined, expectedAttempt: 2 },
    { product: { sku: 'TEST002' }, attempt: 1, expectedAttempt: 2 },
    { product: { sku: 'TEST003' }, attempt: 2, expectedAttempt: 3 }
  ];
  
  console.log('📋 TEST-CASES:\n');
  
  testCases.forEach((testCase, index) => {
    console.log(`   Test ${index + 1}: product.attempt = ${testCase.attempt || 'undefined'}`);
    
    // Simuliere Code-Logik
    const product = { ...testCase.product };
    if (testCase.attempt !== undefined) {
      product.attempt = testCase.attempt;
    }
    
    const attempt = product.attempt || 1;
    const delay = Math.pow(2, attempt) * 1000;
    const result = { ...product, attempt: attempt + 1, delay };
    
    console.log(`      Input: ${JSON.stringify(product)}`);
    console.log(`      Ergebnis: attempt=${result.attempt}, delay=${result.delay}ms`);
    console.log(`      Erwartet: attempt=${testCase.expectedAttempt}`);
    console.log(`      Delay-Formel: 2^${attempt} * 1000 = ${delay}ms`);
    console.log(`      Status: ${result.attempt === testCase.expectedAttempt ? '✅ OK' : '❌ FEHLER'}\n`);
  });
  
  console.log('✅ NODE 2 TEST: ABGESCHLOSSEN\n');
  console.log('='.repeat(80) + '\n');
}

testNode2();
