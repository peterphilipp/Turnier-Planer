const barcodes = [
  '4000208479615', // Milka Schokolade
  '4000006376405', // Ritter Sport
  '4005809200100', // Haribo Goldbären
  '4008400401209', // Coca Cola
];

async function test() {
  for (const bc of barcodes) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${bc}.json`);
      const data = await res.json();
      console.log(`${bc}: status=${data.status}, hasProduct=${!!data.product}, name=${data.product?.product_name || 'N/A'}`);
    } catch (e) {
      console.log(`${bc}: ERROR - ${e.message}`);
    }
  }
}

test();
