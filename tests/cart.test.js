/**
 * Cart logic tests. Run with:  npm test   (node --test)
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const Cart = require('../assets/js/cart.js');
const { LOTS, SHOP } = require('../assets/js/products.js');

const GAT = 'gat';   // Gatomboya, KSh 1450 / 250 g
const KAR = 'kar';   // Karimikui, KSh 1200 / 250 g

test('priceFor scales by bag size and rounds to the nearest 10', () => {
  const lot = Cart.lotById(GAT);
  assert.equal(Cart.priceFor(lot, '250g'), 1450);
  assert.equal(Cart.priceFor(lot, '500g'), 2680);  // 1450 * 1.85 = 2682.5 -> 2680
  assert.equal(Cart.priceFor(lot, '1kg'), 4930);   // 1450 * 3.4  = 4930
});

test('a bigger bag costs less per gram than the small one', () => {
  const lot = Cart.lotById(GAT);
  const perGram = (sizeKey, grams) => Cart.priceFor(lot, sizeKey) / grams;
  assert.ok(perGram('1kg', 1000) < perGram('250g', 250));
});

test('an unknown size falls back to the first size rather than throwing', () => {
  assert.equal(Cart.sizeByKey('nonsense').key, '250g');
});

test('addItem stacks the same lot and size, and splits different sizes', () => {
  const items = [];
  Cart.addItem(items, GAT, '250g');
  Cart.addItem(items, GAT, '250g');
  assert.equal(items.length, 1, 'same lot and size stays one line');
  assert.equal(items[0].qty, 2);

  Cart.addItem(items, GAT, '1kg');
  assert.equal(items.length, 2, 'a different size is its own line');
});

test('addItem rejects a lot that is not in the catalogue', () => {
  assert.throws(() => Cart.addItem([], 'no-such-lot', '250g'), /Unknown lot/);
});

test('changeQty removes the line when it reaches zero', () => {
  const items = [];
  Cart.addItem(items, KAR, '250g');
  Cart.changeQty(items, 0, -1);
  assert.equal(items.length, 0);
});

test('subtotal multiplies every line by its quantity', () => {
  const items = [];
  Cart.addItem(items, GAT, '250g');      // 1450
  Cart.addItem(items, GAT, '250g');      // 2900
  Cart.addItem(items, KAR, '250g');      // + 1200
  assert.equal(Cart.subtotal(items), 4100);
  assert.equal(Cart.itemCount(items), 3);
});

test('delivery is charged below the threshold and waived above it', () => {
  const small = [];
  Cart.addItem(small, KAR, '250g');                       // 1200
  assert.equal(Cart.shipping(small), SHOP.shipping);
  assert.equal(Cart.total(small), 1200 + SHOP.shipping);

  const big = [];
  Cart.addItem(big, GAT, '1kg');                          // 4930
  Cart.addItem(big, KAR, '250g');                         // + 1200 = 6130
  assert.ok(Cart.subtotal(big) >= SHOP.freeOver);
  assert.equal(Cart.shipping(big), 0);
  assert.equal(Cart.total(big), 6130);
});

test('an empty order is charged nothing, delivery included', () => {
  assert.equal(Cart.subtotal([]), 0);
  assert.equal(Cart.shipping([]), 0);
  assert.equal(Cart.total([]), 0);
});

test('amountToFreeShipping reports the shortfall, then zero', () => {
  const items = [];
  Cart.addItem(items, KAR, '250g');                       // 1200
  assert.equal(Cart.amountToFreeShipping(items), SHOP.freeOver - 1200);

  Cart.addItem(items, GAT, '1kg');                        // 6130 total
  assert.equal(Cart.amountToFreeShipping(items), 0);
});

test('sanitise drops retired lots, bad sizes, empty lines and junk input', () => {
  const kept = { id: GAT, size: '250g', qty: 1, grind: 'Espresso' };
  const cleaned = Cart.sanitise([
    kept,
    { id: 'retired', size: '250g', qty: 1 },
    { id: GAT, size: '9kg', qty: 1 },
    { id: GAT, size: '250g', qty: 0 },
    null
  ]);
  assert.deepEqual(cleaned, [kept]);
  assert.deepEqual(Cart.sanitise('not an array'), []);
  assert.deepEqual(Cart.sanitise(undefined), []);
});

test('every catalogue lot prices correctly in every size', () => {
  for (const lot of LOTS) {
    for (const size of ['250g', '500g', '1kg']) {
      const price = Cart.priceFor(lot, size);
      assert.ok(Number.isInteger(price) && price > 0, `${lot.id} ${size} -> ${price}`);
      assert.equal(price % 10, 0, `${lot.id} ${size} should round to 10s`);
    }
  }
});

test('money formats as Kenyan shillings with thousands separators', () => {
  assert.equal(Cart.money(1450), 'KSh 1,450');
  assert.equal(Cart.money(0), 'KSh 0');
});

test('order references are unique enough across many draws', () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(Cart.orderRef());
  assert.ok(seen.size > 400, `expected spread, got ${seen.size} distinct`);
  assert.match(Cart.orderRef(), /^ABR-\d{4}$/);
});
