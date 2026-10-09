# Aberdare Roastery

A small storefront for a Nairobi coffee roaster selling single-lot Kenyan beans.
Browse the catalogue, filter by screen grade, pick a bag size, and run an order
through to checkout.

No framework, no build step, no dependencies. Open `index.html` and it works.

---

## Run it

```bash
git clone https://github.com/Martin-droid/aberdare-roastery.git
cd aberdare-roastery
open index.html          # macOS; or just double-click the file
```

Or serve it over HTTP, which is closer to production:

```bash
npm start                # http://localhost:4173
```

## Tests

The pricing and cart rules are pure functions with no DOM access, so they run
directly under Node:

```bash
npm test
```

```
✔ priceFor scales by bag size and rounds to the nearest 10
✔ a bigger bag costs less per gram than the small one
✔ delivery is charged below the threshold and waived above it
✔ sanitise drops retired lots, bad sizes, empty lines and junk input
… 14 tests, 0 failures
```

---

## What it does

| Feature | Detail |
|---|---|
| Catalogue | Six lots, filterable by screen grade (AA / AB / PB) |
| Bag sizes | 250 g, 500 g, 1 kg — every price on the page updates |
| Cart | Quantity stepping, per-bag grind choice, line removal |
| Delivery | KSh 350 in Nairobi, free over KSh 5,000, with a live shortfall prompt |
| Checkout | Validated name and phone, delivery area, M-Pesa till, order reference |
| Persistence | The order survives a reload, saved in the browser |
| Theming | Follows the reader's light or dark system setting |
| Responsive | One column on a phone, up to three on a wide screen |

## Layout

```
aberdare-roastery/
├── index.html              markup only — no inline styles or scripts
├── assets/
│   ├── css/styles.css      design tokens, then components built from them
│   └── js/
│       ├── products.js     catalogue data and shop settings
│       ├── cart.js         pricing and cart rules — pure, no DOM
│       └── app.js          rendering and event wiring
└── tests/cart.test.js      node --test
```

The split matters in one specific way: `cart.js` touches no DOM, which is what
lets the money logic be tested without a browser. `app.js` never calculates a
price itself — it asks `cart.js`.

Scripts load in dependency order (`products` → `cart` → `app`) as plain
`<script>` tags rather than ES modules, so the page also works when opened
straight off the filesystem, where module loading is blocked by CORS.

## Pricing

Each lot carries a 250 g base price. Larger bags apply a multiplier that sits
below the straight weight ratio, so buying more is cheaper per gram:

| Size | Multiplier | Per gram vs 250 g |
|---|---|---|
| 250 g | 1.0 | — |
| 500 g | 1.85 | 7.5% cheaper |
| 1 kg | 3.4 | 15% cheaper |

Results round to the nearest 10 shillings, the way a shop quotes a price.
Gatomboya at KSh 1,450 per 250 g becomes KSh 2,680 for 500 g and KSh 4,930 for
a kilo.

## The coffee

Products are real Kenyan coffee terms rather than placeholder text. Grades
follow the screen-size system the auction uses — **AA** is screen 17–18,
**AB** is 15–16, **PB** is peaberry, where the cherry grows one round bean
instead of two flat halves. Lots are named for the washing stations that
process them (Gatomboya, Kii, Karimikui) across Nyeri, Kirinyaga and Kiambu,
with SL28, SL34, Batian and Ruiru 11 varietals and altitudes in metres above
sea level.

Roast date is shown on every card because for coffee this fresh it is the
number that actually matters.

## Notes

This is a front-end demo. There is no server, no account system and no payment
processing — placing an order produces a reference number and clears the cart,
nothing more. The M-Pesa till is not real.

The order is kept in `localStorage`, which means it lives in that one browser:
it survives a reload, and it never reaches another device or any server. Every
read and write is wrapped, so a private window or blocked site data degrades to
an empty cart instead of a broken page.

## Licence

MIT — see [LICENSE](LICENSE).
