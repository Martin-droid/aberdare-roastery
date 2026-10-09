/**
 * Catalogue data.
 *
 * Grades follow the Kenyan screen-size system: AA is screen 17-18, AB is 15-16,
 * PB is peaberry (a single round bean instead of the usual two flat halves).
 * Altitudes are metres above sea level. Prices are the 250 g rate in KSh;
 * larger bags are derived from it in cart.js.
 */
(function (root) {
  'use strict';

  var LOTS = [
    {
      id: 'gat', name: 'Gatomboya Factory', region: 'Nyeri', grade: 'AA',
      process: 'Washed', varietal: 'SL28 · SL34', alt: 1920, lot: '24-117',
      roast: '06 Oct', base: 1450, roastColor: '#5E3620',
      notes: 'Blackcurrant, pink grapefruit, dark chocolate'
    },
    {
      id: 'kii', name: 'Kii Factory', region: 'Kirinyaga', grade: 'AA',
      process: 'Washed', varietal: 'SL28 · SL34 · Ruiru 11', alt: 1750, lot: '24-121',
      roast: '06 Oct', base: 1380, roastColor: '#6B3F23',
      notes: 'Plum, ripe tomato, cane sugar'
    },
    {
      id: 'kar', name: 'Karimikui', region: 'Kirinyaga', grade: 'AB',
      process: 'Washed', varietal: 'SL28 · SL34', alt: 1700, lot: '24-104',
      roast: '06 Oct', base: 1200, roastColor: '#7A4A28',
      notes: 'Raspberry, lime zest, molasses'
    },
    {
      id: 'thi', name: 'Thiriku', region: 'Nyeri', grade: 'PB',
      process: 'Washed', varietal: 'SL28 · Batian', alt: 1850, lot: '24-130',
      roast: '06 Oct', base: 1520, roastColor: '#55301C',
      notes: 'Passion fruit, blackberry, caramel'
    },
    {
      id: 'kie', name: 'Kieni', region: 'Kirinyaga', grade: 'AA',
      process: 'Natural', varietal: 'SL28 · SL34', alt: 1800, lot: '24-133',
      roast: '06 Oct', base: 1650, roastColor: '#412015',
      notes: 'Strawberry, dark rum, cocoa nib'
    },
    {
      id: 'mch', name: 'Mchana Estate', region: 'Kiambu', grade: 'AB',
      process: 'Honey', varietal: 'Batian · Ruiru 11', alt: 1650, lot: '24-096',
      roast: '06 Oct', base: 1180, roastColor: '#8A5A30',
      notes: 'Apricot, red apple, brown sugar'
    }
  ];

  // Bigger bags carry a volume discount, so the multiplier is below the
  // straight weight ratio (1 kg is 4x the weight but 3.4x the price).
  var SIZES = [
    { key: '250g', label: '250 g', mult: 1 },
    { key: '500g', label: '500 g', mult: 1.85 },
    { key: '1kg',  label: '1 kg',  mult: 3.4 }
  ];

  var GRINDS = ['Whole bean', 'Espresso', 'V60 / pour-over', 'French press', 'AeroPress'];
  var GRADES = ['All', 'AA', 'AB', 'PB'];

  var SHOP = {
    shipping: 350,       // KSh, within Nairobi
    freeOver: 5000,      // KSh, order value that waives delivery
    till: '802 4417',    // M-Pesa till
    batch: 'Tue 06 Oct 2026',
    dispatch: 'Wed 07 Oct'
  };

  var api = { LOTS: LOTS, SIZES: SIZES, GRINDS: GRINDS, GRADES: GRADES, SHOP: SHOP };

  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Catalogue = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
