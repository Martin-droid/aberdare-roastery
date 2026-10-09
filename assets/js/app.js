/**
 * UI layer: renders the catalogue and the order panel, and wires up events.
 * All pricing and totals come from Cart (assets/js/cart.js).
 */
(function () {
  'use strict';

  var LOTS = Catalogue.LOTS;
  var SIZES = Catalogue.SIZES;
  var GRINDS = Catalogue.GRINDS;
  var GRADES = Catalogue.GRADES;
  var SHOP = Catalogue.SHOP;

  var STORE_KEY = 'aberdare.order.v1';

  var state = { grade: 'All', size: '250g', items: [], step: 'cart', order: null };

  /* ---------------------------------------------------------- persistence */
  /* A convenience only: the order lives in this browser and nowhere else. */
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ items: state.items, size: state.size }));
    } catch (e) {
      /* private window, or site data blocked — the page works without it */
    }
  }

  function restore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      state.items = Cart.sanitise(data && data.items);
      if (data && Cart.sizeByKey(data.size).key === data.size) state.size = data.size;
    } catch (e) {
      /* unreadable or malformed — start empty */
    }
  }

  /* --------------------------------------------------------------- helpers */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2000);
  }

  /* ------------------------------------------------------------ cart edits */
  function add(id, sizeKey) {
    Cart.addItem(state.items, id, sizeKey);
    state.step = 'cart';
    save(); renderCount(); renderPanel();
    toast(Cart.lotById(id).name + ' · ' + Cart.sizeByKey(sizeKey).label + ' added');
  }

  function bump(index, delta) {
    Cart.changeQty(state.items, index, delta);
    save(); renderCount(); renderPanel();
  }

  function remove(index) {
    Cart.removeItem(state.items, index);
    save(); renderCount(); renderPanel();
  }

  /* --------------------------------------------------- segmented controls */
  function renderSegs() {
    var grades = document.getElementById('gradeSeg');
    grades.textContent = '';
    GRADES.forEach(function (grade) {
      var b = el('button', 'chip ui', grade === 'All' ? 'All lots' : grade);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.grade === grade));
      b.addEventListener('click', function () {
        state.grade = grade; renderSegs(); renderGrid();
      });
      grades.appendChild(b);
    });

    var sizes = document.getElementById('sizeSeg');
    sizes.textContent = '';
    SIZES.forEach(function (sz) {
      var b = el('button', 'chip ui', sz.label);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(state.size === sz.key));
      b.addEventListener('click', function () {
        state.size = sz.key; save(); renderSegs(); renderGrid();
      });
      sizes.appendChild(b);
    });
  }

  /* ------------------------------------------------------------- the grid */
  function visibleLots() {
    if (state.grade === 'All') return LOTS;
    return LOTS.filter(function (l) { return l.grade === state.grade; });
  }

  function renderGrid() {
    var grid = document.getElementById('grid');
    grid.textContent = '';
    var lots = visibleLots();

    document.getElementById('tally').textContent =
      lots.length + (lots.length === 1 ? ' lot' : ' lots') +
      ' · priced per ' + Cart.sizeByKey(state.size).label + ' bag';

    lots.forEach(function (lot) {
      var card = el('article', 'lot');

      // Bag label, drawn in CSS: grade, process, lot number and a roast swatch.
      var label = el('div', 'label');
      label.style.setProperty('--roast', lot.roastColor);
      var top = el('div', 'label-top');
      top.appendChild(el('span', 'gradebadge', lot.grade));
      top.appendChild(el('span', 'process', lot.process));
      label.appendChild(top);
      label.appendChild(el('span', 'lotno', 'LOT ' + lot.lot));
      card.appendChild(label);

      var body = el('div', 'lot-body');
      body.appendChild(el('h3', null, lot.name));
      body.appendChild(el('p', 'origin', lot.region + ' · ' + lot.varietal));
      body.appendChild(el('p', 'notes', lot.notes));

      var spec = el('div', 'spec');
      spec.appendChild(el('span', null, 'Altitude'));
      spec.appendChild(el('b', null, lot.alt.toLocaleString('en-KE') + ' masl'));
      spec.appendChild(el('span', null, 'Process'));
      spec.appendChild(el('b', null, lot.process));
      spec.appendChild(el('span', null, 'Roasted'));
      spec.appendChild(el('b', null, lot.roast + ' 2026'));
      body.appendChild(spec);

      var buy = el('div', 'buy');
      var price = el('span', 'price');
      price.appendChild(document.createTextNode(Cart.money(Cart.priceFor(lot, state.size))));
      price.appendChild(el('small', null, ' / ' + Cart.sizeByKey(state.size).label));
      buy.appendChild(price);

      var addBtn = el('button', 'btn btn-solid ui', 'Add');
      addBtn.type = 'button';
      addBtn.setAttribute('aria-label',
        'Add ' + lot.name + ', ' + Cart.sizeByKey(state.size).label + ', to your order');
      addBtn.addEventListener('click', function () { add(lot.id, state.size); });
      buy.appendChild(addBtn);

      body.appendChild(buy);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  /* ------------------------------------------------------------ cart badge */
  function renderCount() {
    var n = Cart.itemCount(state.items);
    var c = document.getElementById('count');
    c.textContent = String(n);
    c.dataset.empty = n ? '0' : '1';
    document.getElementById('openCart').setAttribute('aria-label',
      n ? 'Open your order, ' + n + ' bag' + (n === 1 ? '' : 's') : 'Open your order, empty');
  }

  /* ----------------------------------------------------------- order panel */
  function renderPanel() {
    var body = document.getElementById('panelBody');
    var foot = document.getElementById('panelFoot');
    body.textContent = ''; foot.textContent = '';

    if (state.step === 'done' && state.order) return renderReceipt(body, foot);

    document.getElementById('panelTitle').textContent =
      state.step === 'checkout' ? 'Delivery details' : 'Your order';

    if (!state.items.length) {
      var empty = el('div', 'empty');
      empty.appendChild(el('strong', null, 'Nothing in your order yet.'));
      empty.appendChild(el('p', null,
        'Pick a lot from the catalogue — every bag is roasted the Tuesday before it ships.'));
      body.appendChild(empty);

      var back = el('button', 'btn btn-block ui', 'Browse the lots');
      back.type = 'button';
      back.addEventListener('click', closePanel);
      foot.appendChild(back);
      return;
    }

    if (state.step === 'checkout') return renderCheckout(body, foot);

    state.items.forEach(function (it, index) {
      var lot = Cart.lotById(it.id);
      var unit = Cart.priceFor(lot, it.size);
      var row = el('div', 'line');

      row.appendChild(el('div', 'line-name', lot.name));
      row.appendChild(el('div', 'line-amt', Cart.money(unit * it.qty)));
      row.appendChild(el('div', 'line-sub',
        lot.grade + ' · ' + Cart.sizeByKey(it.size).label + ' · ' + Cart.money(unit) + ' each'));
      row.appendChild(el('div'));

      var ctl = el('div', 'line-ctl');

      var step = el('div', 'step');
      var minus = el('button', null, '−');
      minus.type = 'button';
      minus.setAttribute('aria-label', 'One fewer bag of ' + lot.name);
      minus.addEventListener('click', function () { bump(index, -1); });
      var plus = el('button', null, '+');
      plus.type = 'button';
      plus.setAttribute('aria-label', 'One more bag of ' + lot.name);
      plus.addEventListener('click', function () { bump(index, 1); });
      step.appendChild(minus);
      step.appendChild(el('span', 'mono', String(it.qty)));
      step.appendChild(plus);
      ctl.appendChild(step);

      var sel = document.createElement('select');
      sel.id = 'grind-' + it.id + '-' + it.size;
      sel.setAttribute('aria-label', 'Grind for ' + lot.name);
      GRINDS.forEach(function (g) {
        var o = document.createElement('option');
        o.value = g; o.textContent = g;
        if (g === it.grind) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () { it.grind = sel.value; save(); });
      ctl.appendChild(sel);

      var rm = el('button', 'drop', 'Remove');
      rm.type = 'button';
      rm.addEventListener('click', function () { remove(index); });
      ctl.appendChild(rm);

      row.appendChild(ctl);
      body.appendChild(row);
    });

    foot.appendChild(sumsBlock());

    var gap = Cart.amountToFreeShipping(state.items);
    if (gap > 0) {
      foot.appendChild(el('p', 'ship-note',
        'Add ' + Cart.money(gap) + ' for free delivery.'));
    }

    var go = el('button', 'btn btn-solid btn-block ui', 'Checkout');
    go.type = 'button';
    go.addEventListener('click', function () { state.step = 'checkout'; renderPanel(); });
    foot.appendChild(go);
  }

  function sumsBlock() {
    var sums = el('div', 'sums');
    function row(label, value, cls) {
      var d = el('div', cls);
      d.appendChild(el('span', null, label));
      d.appendChild(el('span', null, value));
      sums.appendChild(d);
    }
    var ship = Cart.shipping(state.items);
    row('Subtotal', Cart.money(Cart.subtotal(state.items)));
    row('Delivery, Nairobi', ship === 0 ? 'Free' : Cart.money(ship));
    row('Total', Cart.money(Cart.total(state.items)), 'tot');
    return sums;
  }

  /* -------------------------------------------------------------- checkout */
  function renderCheckout(body, foot) {
    var form = document.createElement('form');
    form.id = 'checkoutForm';
    form.noValidate = true;

    [
      { id: 'co-name',  label: 'Full name',     type: 'text', ph: 'Martin Ndegwa', ac: 'name' },
      { id: 'co-phone', label: 'Phone (M-Pesa)', type: 'tel', ph: '07xx xxx xxx',  ac: 'tel' }
    ].forEach(function (f) {
      var wrap = el('div', 'field');
      var label = el('label', null, f.label);
      label.htmlFor = f.id;
      var input = document.createElement('input');
      input.id = f.id; input.name = f.id; input.type = f.type;
      input.placeholder = f.ph; input.autocomplete = f.ac;
      wrap.appendChild(label);
      wrap.appendChild(input);
      wrap.appendChild(el('span', 'err', ''));
      form.appendChild(wrap);
    });

    var areaWrap = el('div', 'field');
    var areaLabel = el('label', null, 'Delivery area');
    areaLabel.htmlFor = 'co-area';
    var area = document.createElement('select');
    area.id = 'co-area'; area.name = 'co-area';
    ['Westlands', 'Kilimani', 'Karen', 'Lavington', 'CBD', 'Parklands', 'Ruaka', 'Syokimau']
      .forEach(function (a) {
        var o = document.createElement('option');
        o.value = a; o.textContent = a;
        area.appendChild(o);
      });
    areaWrap.appendChild(areaLabel);
    areaWrap.appendChild(area);
    form.appendChild(areaWrap);

    form.appendChild(tillBlock());
    body.appendChild(form);

    var place = el('button', 'btn btn-solid btn-block ui',
      'Place order · ' + Cart.money(Cart.total(state.items)));
    place.type = 'button';
    place.addEventListener('click', function () { submitOrder(form); });
    foot.appendChild(place);

    var back = el('button', 'btn btn-block ui', 'Back to order');
    back.type = 'button';
    back.addEventListener('click', function () { state.step = 'cart'; renderPanel(); });
    foot.appendChild(back);

    var first = form.querySelector('input');
    if (first) first.focus();
  }

  function tillBlock() {
    var till = el('div', 'till');
    var row = el('div', 'till-row');
    row.appendChild(el('span', 'line-sub', 'M-Pesa till'));

    var code = document.createElement('code');
    code.textContent = SHOP.till;
    row.appendChild(code);

    var copy = el('button', 'btn', 'Copy');
    copy.type = 'button';
    copy.addEventListener('click', function () {
      function selectInstead() {
        var range = document.createRange();
        range.selectNodeContents(code);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        toast('Till number selected — copy it with your keyboard');
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(SHOP.till)
          .then(function () { toast('Till number copied'); }, selectInstead);
      } else {
        selectInstead();
      }
    });
    row.appendChild(copy);

    till.appendChild(row);
    till.appendChild(el('p', null,
      'Pay after you place the order. We confirm by SMS before the ' +
      SHOP.dispatch + ' dispatch.'));
    return till;
  }

  function submitOrder(form) {
    var name = form.querySelector('#co-name');
    var phone = form.querySelector('#co-phone');
    var ok = true;

    function mark(input, message) {
      input.parentNode.querySelector('.err').textContent = message || '';
      if (message) ok = false;
    }

    mark(name, name.value.trim().length < 2 ? 'Enter the name for the delivery.' : '');
    mark(phone, phone.value.replace(/\D/g, '').length < 9
      ? 'Enter a phone number we can reach you on.' : '');

    if (!ok) {
      var bad = form.querySelector('.err:not(:empty)');
      if (bad) bad.parentNode.querySelector('input').focus();
      return;
    }

    state.order = {
      ref: Cart.orderRef(),
      name: name.value.trim(),
      area: form.querySelector('#co-area').value,
      ship: Cart.shipping(state.items),
      total: Cart.total(state.items),
      lines: state.items.map(function (it) {
        var lot = Cart.lotById(it.id);
        return {
          text: lot.name + ' · ' + Cart.sizeByKey(it.size).label + ' · ' + it.grind + ' × ' + it.qty,
          amt: Cart.priceFor(lot, it.size) * it.qty
        };
      })
    };

    state.items = [];
    state.step = 'done';
    save(); renderCount(); renderPanel();
  }

  /* --------------------------------------------------------------- receipt */
  function renderReceipt(body, foot) {
    document.getElementById('panelTitle').textContent = 'Order placed';
    var o = state.order;

    var receipt = el('div', 'receipt');

    var stamp = el('div', 'stamp');
    stamp.appendChild(el('b', null, 'Order ' + o.ref));
    stamp.appendChild(el('span', null, 'Dispatch ' + SHOP.dispatch + ' · ' + o.area));
    receipt.appendChild(stamp);

    receipt.appendChild(el('p', 'line-sub',
      'Thanks, ' + o.name + '. Pay ' + Cart.money(o.total) + ' to till ' + SHOP.till +
      ' and we will confirm by SMS before dispatch.'));

    var list = el('div', 'receipt-list');
    function line(label, value, strong) {
      var d = el('div');
      if (strong) d.style.color = 'var(--ink)';
      d.appendChild(el('span', null, label));
      d.appendChild(el('span', null, value));
      list.appendChild(d);
    }
    o.lines.forEach(function (ln) { line(ln.text, Cart.money(ln.amt)); });
    line('Delivery', o.ship === 0 ? 'Free' : Cart.money(o.ship));
    line('Paid on delivery', Cart.money(o.total), true);
    receipt.appendChild(list);

    body.appendChild(receipt);

    var again = el('button', 'btn btn-solid btn-block ui', 'Order more coffee');
    again.type = 'button';
    again.addEventListener('click', function () {
      state.step = 'cart';
      state.order = null;
      closePanel();
      renderPanel();
    });
    foot.appendChild(again);
  }

  /* ---------------------------------------------------------- open / close */
  var lastFocus = null;

  function openPanel() {
    lastFocus = document.activeElement;
    document.getElementById('scrim').classList.add('on');
    var panel = document.getElementById('panel');
    panel.classList.add('on');
    panel.setAttribute('aria-hidden', 'false');
    renderPanel();
    document.getElementById('closeCart').focus();
  }

  function closePanel() {
    document.getElementById('scrim').classList.remove('on');
    var panel = document.getElementById('panel');
    panel.classList.remove('on');
    panel.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ------------------------------------------------------------------ boot */
  function start() {
    document.getElementById('openCart').addEventListener('click', openPanel);
    document.getElementById('closeCart').addEventListener('click', closePanel);
    document.getElementById('scrim').addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.getElementById('panel').classList.contains('on')) {
        closePanel();
      }
    });

    restore();
    renderSegs();
    renderGrid();
    renderCount();
    renderPanel();
  }

  start();
})();
