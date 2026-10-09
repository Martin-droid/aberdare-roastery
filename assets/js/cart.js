/**
 * Cart logic — pricing, totals and line manipulation.
 *
 * Deliberately free of DOM access so it can run under `node --test`
 * (see tests/cart.test.js). The UI layer in app.js owns all rendering.
 */
(function (root) {
  'use strict';

  var Catalogue = (typeof module === 'object' && module.exports)
    ? require('./products.js')
    : root.Catalogue;

  var LOTS = Catalogue.LOTS;
  var SIZES = Catalogue.SIZES;
  var GRINDS = Catalogue.GRINDS;
  var SHOP = Catalogue.SHOP;

  function lotById(id) {
    for (var i = 0; i < LOTS.length; i++) if (LOTS[i].id === id) return LOTS[i];
    return null;
  }

  function sizeByKey(key) {
    for (var i = 0; i < SIZES.length; i++) if (SIZES[i].key === key) return SIZES[i];
    return SIZES[0];
  }

  /** Shelf price, rounded to the nearest 10 shillings the way a shop quotes it. */
  function priceFor(lot, sizeKey) {
    return Math.round(lot.base * sizeByKey(sizeKey).mult / 10) * 10;
  }

  function money(n) {
    return 'KSh ' + n.toLocaleString('en-KE');
  }

  function subtotal(items) {
    return items.reduce(function (sum, it) {
      var lot = lotById(it.id);
      return lot ? sum + priceFor(lot, it.size) * it.qty : sum;
    }, 0);
  }

  /** Free over the threshold; nothing to deliver means nothing to charge. */
  function shipping(items) {
    if (!items.length) return 0;
    return subtotal(items) >= SHOP.freeOver ? 0 : SHOP.shipping;
  }

  function total(items) {
    return subtotal(items) + shipping(items);
  }

  function itemCount(items) {
    return items.reduce(function (sum, it) { return sum + it.qty; }, 0);
  }

  /** Shortfall to free delivery, or 0 once it is earned. */
  function amountToFreeShipping(items) {
    var gap = SHOP.freeOver - subtotal(items);
    return gap > 0 ? gap : 0;
  }

  /**
   * Adds a bag. The same lot in a different size is a separate line, because
   * a 250 g and a 1 kg bag of one coffee are different products on the shelf.
   * Mutates and returns `items`.
   */
  function addItem(items, id, sizeKey, grind) {
    if (!lotById(id)) throw new Error('Unknown lot: ' + id);
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id && items[i].size === sizeKey) {
        items[i].qty += 1;
        return items;
      }
    }
    items.push({ id: id, size: sizeKey, qty: 1, grind: grind || GRINDS[0] });
    return items;
  }

  /** Steps a line's quantity; dropping to zero removes the line. */
  function changeQty(items, index, delta) {
    var it = items[index];
    if (!it) return items;
    it.qty += delta;
    if (it.qty < 1) items.splice(index, 1);
    return items;
  }

  function removeItem(items, index) {
    items.splice(index, 1);
    return items;
  }

  /** Drops anything that no longer matches the catalogue (e.g. a retired lot). */
  function sanitise(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(function (it) {
      return it && lotById(it.id) && sizeByKey(it.size).key === it.size && it.qty > 0;
    });
  }

  function orderRef() {
    return 'ABR-' + String(Math.floor(Math.random() * 9000) + 1000);
  }

  var api = {
    lotById: lotById, sizeByKey: sizeByKey, priceFor: priceFor, money: money,
    subtotal: subtotal, shipping: shipping, total: total, itemCount: itemCount,
    amountToFreeShipping: amountToFreeShipping,
    addItem: addItem, changeQty: changeQty, removeItem: removeItem,
    sanitise: sanitise, orderRef: orderRef
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Cart = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
