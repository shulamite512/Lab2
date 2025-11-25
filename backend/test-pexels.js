

const { getPropertyImages } = require('./services/pexelsService');

async function testPexelsService() {
  console.log('Testing Pexels API Service...\n');

  try {
    // Test 1: Apartment images
    console.log('Test 1: Fetching images for "apartment" in "New York"...');
    const apartmentImages = await getPropertyImages('apartment', 'New York');
    console.log('Apartment images:');
    apartmentImages.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    console.log('');

    // Test 2: House images
    console.log('Test 2: Fetching images for "house" in "California"...');
    const houseImages = await getPropertyImages('house', 'California');
    console.log('House images:');
    houseImages.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    console.log('');

    // Test 3: Villa images
    console.log('Test 3: Fetching images for "villa"...');
    const villaImages = await getPropertyImages('villa');
    console.log('Villa images:');
    villaImages.forEach((url, index) => {
      console.log(`  ${index + 1}. ${url}`);
    });
    console.log('');

    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

testPexelsService();
