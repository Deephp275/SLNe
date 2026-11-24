(function () {
  var D = window.DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pages = $$('[data-page]');
  var catBySlug = {}; D.cats.forEach(function (c) { catBySlug[c.slug] = c; });
  var topOf = function (slug) { var c = catBySlug[slug]; return c ? (c.parent || c.slug) : null; };

  // Pictures are stored once in window.IMG and attached to each <img data-i> when its page is shown (keeps the file small and the first load light)
  function hydrate(root) { if (!root) return; $$('img[data-i]', root).forEach(function (im) { if (!im.getAttribute('src')) im.setAttribute('src', window.IMG[im.getAttribute('data-i')]); }); }
  $$('img[data-i]').forEach(function (im) { if (!im.closest('[data-page]')) im.setAttribute('src', window.IMG[im.getAttribute('data-i')]); });

  // ---------- mobile menu ----------
  var header = $('header'); var menuBtn = $('button[aria-label="Toggle menu"]'); var menu = header && header.children[1];
  var menuOpen = false;
  function setMenu(open) {
    menuOpen = open; if (!menu) return;
    ['pointer-events-none', 'invisible', '-translate-y-2', 'opacity-0'].forEach(function (c) { menu.classList.toggle(c, !open); });
    ['visible', 'translate-y-0', 'opacity-100'].forEach(function (c) { menu.classList.toggle(c, open); });
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
  }
  if (menuBtn) menuBtn.addEventListener('click', function () { setMenu(!menuOpen); });

  // ---------- router ----------
  function route() {
    var raw = location.hash.slice(1) || '/'; var i = raw.indexOf('?');
    var path = (i < 0 ? raw : raw.slice(0, i)).replace(/\/+$/, '') || '/';
    var q = new URLSearchParams(i < 0 ? '' : raw.slice(i + 1));
    var found = false;
    pages.forEach(function (p) { if (p.dataset.page === path) found = true; });
    if (!found) path = '/';
    pages.forEach(function (p) {
      var on = p.dataset.page === path; p.hidden = !on;
      if (on) { p.classList.remove('page-in'); void p.offsetWidth; p.classList.add('page-in'); document.title = p.dataset.title; }
    });
    hydrate(document.querySelector('[data-page]:not([hidden])'));
    $$('header a[href^="#/"]').forEach(function (a) {
      var h = a.getAttribute('href').slice(1);
      a.classList.toggle('nav-active', h === '/' ? path === '/' : path.indexOf(h) === 0);
    });
    setMenu(false); window.scrollTo(0, 0);
    if (path === '/products') setFilters(q);
    if (path === '/quotation' && q.get('product')) prefillQuote(q);
  }
  window.addEventListener('hashchange', route);

  // ---------- product filters ----------
  var fq = $('#pf-q'), fc = $('#pf-c'), fb = $('#pf-b'), ft = $('#pf-t');
  var lastTop = '__';
  function scope(tc) { return Object.keys(D.products).map(function (s) { return D.products[s]; }).filter(function (p) { return !tc || p.top === tc; }); }
  function opt(v, t) { return '<option value="' + v + '">' + t + '</option>'; }
  function rebuild(tc) {
    var cv = fc.value, bv = fb.value, tv = ft.value;
    var tops = D.cats.filter(function (c) { return !c.parent && (!tc || c.slug === tc); });
    fc.innerHTML = opt('', 'All categories') + tops.map(function (t) {
      return '<optgroup label="' + t.name + '">' + opt(t.slug, 'All ' + t.name) + D.cats.filter(function (c) { return c.parent === t.slug; }).map(function (c) { return opt(c.slug, c.name); }).join('') + '</optgroup>';
    }).join('');
    fc.value = cv;
    var sc = scope(tc);
    var brands = D.brands.filter(function (b) { return sc.some(function (p) { return p.brandSlug === b.slug; }); });
    fb.innerHTML = opt('', 'All brands') + brands.map(function (b) { return opt(b.slug, b.name); }).join('');
    fb.value = bv; $('#pf-b-wrap').hidden = !brands.length;
    var th = []; sc.forEach(function (p) { p.variants.forEach(function (v) { if (th.indexOf(v) < 0) th.push(v); }); });
    th.sort(function (a, b) { return (parseFloat(a) - parseFloat(b)) || a.localeCompare(b); });
    ft.innerHTML = opt('', 'Any') + th.map(function (t) { return opt(t.replace(/"/g, '&quot;'), t.replace(/"/g, '&quot;')); }).join('');
    ft.value = tv; $('#pf-t-wrap').hidden = !th.length;
  }
  function match(p) {
    var c = fc.value;
    if (c) { var co = catBySlug[c]; if (co && !co.parent ? p.top !== c : p.cat !== c) return false; }
    if (fb.value && p.brandSlug !== fb.value) return false;
    if (ft.value && p.variants.indexOf(ft.value) < 0) return false;
    if (fq.value.trim()) {
      var hay = (p.name + ' ' + p.brand + ' ' + p.catName + ' ' + p.desc).toLowerCase();
      if (!fq.value.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; })) return false;
    }
    return true;
  }
  function refresh() {
    var tc = fc.value ? topOf(fc.value) : null;
    if (tc !== lastTop) { rebuild(tc); lastTop = tc; }
    var n = 0;
    $$('article[data-slug]').forEach(function (a) { var ok = match(D.products[a.dataset.slug]); a.hidden = !ok; if (ok) n++; });
    $$('[data-sec]').forEach(function (s) { s.hidden = !$$('article[data-slug]', s).some(function (a) { return !a.hidden; }); });
    $('#pf-count').textContent = n + ' product' + (n === 1 ? '' : 's');
    $('#pf-none').hidden = n > 0;
    $('#pf-clear').hidden = !(fq.value || fc.value || fb.value || ft.value);
  }
  function setFilters(q) {
    lastTop = '__'; fq.value = q.get('q') || ''; fc.value = ''; fb.value = ''; ft.value = '';
    rebuild(null); fc.value = q.get('category') || ''; fb.value = q.get('brand') || '';
    lastTop = '__'; refresh(); fb.value = q.get('brand') || ''; refresh();
  }
  [fq, fb, ft].forEach(function (el) { el.addEventListener('input', refresh); });
  fc.addEventListener('change', function () { fb.value = ''; ft.value = ''; refresh(); });
  $('#pf-clear').addEventListener('click', function () { fq.value = ''; fc.value = ''; fb.value = ''; ft.value = ''; lastTop = '__'; refresh(); });

  // ---------- product detail pages ----------
  function waUrl(msg) { return 'https://wa.me/' + D.wa + '?text=' + encodeURIComponent(msg); }
  $$('[data-page^="/products/"]').forEach(function (page) {
    var slug = page.dataset.page.split('/').pop(); var p = D.products[slug]; if (!p) return;
    var mainImg = $('div.wood img', page);
    $$('button[aria-label^="Photo"]', page).forEach(function (b) {
      b.addEventListener('click', function () {
        if (mainImg) mainImg.src = $('img', b).src;
        $$('button[aria-label^="Photo"]', page).forEach(function (x) { x.classList.toggle('opacity-70', x !== b); x.classList.toggle('border-gold', x === b); });
      });
    });
    function details() {
      var sel = $('#var', page); var v = sel && sel.value ? sel.options[sel.selectedIndex].text : '';
      return { v: v, qty: ($('#qty', page) || {}).value || '', msg: ($('#m', page) || {}).value || '' };
    }
    var wa = $('a.btn-wa', page);
    if (wa) wa.addEventListener('click', function () {
      var d = details();
      var lines = ['Hello ' + D.business + ',', 'I would like to enquire about:', 'Product: ' + p.name];
      if (p.brand) lines.push('Brand: ' + p.brand);
      if (d.v) lines.push('Specifications: Thickness/Size: ' + d.v);
      lines.push('Required quantity: ' + (d.qty || 'To be discussed'));
      if (d.msg) lines.push('Message: ' + d.msg);
      wa.href = waUrl(lines.join('\n')); wa.target = '_blank'; wa.rel = 'noopener noreferrer';
    });
    var bq = $$('a.btn-outline', page).filter(function (a) { return /Bulk Quotation/.test(a.textContent); })[0];
    if (bq) bq.addEventListener('click', function () {
      var d = details();
      bq.href = '#/quotation?product=' + encodeURIComponent(p.name + (d.v ? ' (' + d.v + ')' : '')) + '&qty=' + encodeURIComponent(d.qty);
    });
  });

  // ---------- gallery ----------
  var chips = $$('[data-chip]');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) {
        var on = x === c;
        x.className = x.className.replace(/border-gold bg-gold text-ink|border-gold\/30 text-cream\/75 hover:border-gold/, on ? 'border-gold bg-gold text-ink' : 'border-gold/30 text-cream/75 hover:border-gold');
      });
      var cat = c.textContent.trim();
      $$('[data-gal]').forEach(function (g) { g.hidden = cat !== 'All' && g.dataset.cat !== cat; });
    });
  });
  $$('[data-gal]').forEach(function (g) {
    g.addEventListener('click', function () {
      var ov = document.createElement('div');
      ov.className = 'fixed inset-0 z-50 grid place-items-center bg-black/90 p-4'; ov.style.cursor = 'zoom-out';
      var im = document.createElement('img'); im.src = $('img', g).src; im.className = 'max-h-[88vh] max-w-full object-contain';
      ov.appendChild(im); ov.addEventListener('click', function () { ov.remove(); }); document.body.appendChild(ov);
    });
  });

  // ---------- enquiry forms -> WhatsApp ----------
  function digits(v) { return (v || '').replace(/\D/g, ''); }
  function validEmail(v) { return !v || /^\S+@\S+\.\S+$/.test(v); }
  function showErr(form, text) { var e = $('[data-err]', form); e.textContent = text; e.hidden = !text; }
  function done(form, text) { form.innerHTML = '<div class="p-6 text-center" role="status"><div class="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold text-2xl text-gold">✓</div><h2 class="h-display mt-5 text-2xl">' + text + '</h2><p class="mt-3 text-sm text-cream/65">If WhatsApp did not open, please call us using the numbers on the Contact page.</p></div>'; }

  var qform = $('#qform');
  var itemsBox = $('#q-items');
  function addItem(name, qty) {
    var d = document.createElement('div'); d.className = 'grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]';
    d.innerHTML = '<input class="input" data-i="n" aria-label="Product name" placeholder="Product name"><input class="input" data-i="q" aria-label="Quantity" placeholder="Qty"><input class="input" data-i="x" aria-label="Notes" placeholder="Size / notes"><button type="button" class="btn-outline btn-sm" aria-label="Remove product">✕</button>';
    $('[data-i=n]', d).value = name || ''; $('[data-i=q]', d).value = qty || '';
    $('button', d).addEventListener('click', function () { if (itemsBox.children.length > 1) d.remove(); });
    itemsBox.appendChild(d);
  }
  addItem();
  $('#q-add').addEventListener('click', function () { addItem(); });
  function prefillQuote(q) { itemsBox.innerHTML = ''; addItem(q.get('product'), q.get('qty')); }
  qform.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (id) { return $('#' + id, qform).value.trim(); };
    if (!g('q-name')) return showErr(qform, 'Please enter your name.');
    if (digits(g('q-phone')).length < 7) return showErr(qform, 'Please enter a valid phone number.');
    if (!validEmail(g('q-email'))) return showErr(qform, 'Please enter a valid email.');
    if (!g('q-req')) return showErr(qform, 'Please describe your requirements.');
    var L = ['Hello ' + D.business + ', I would like a quotation.', '', 'Name: ' + g('q-name'), 'Phone: ' + g('q-phone')];
    if (g('q-co')) L.push('Company: ' + g('q-co')); if (g('q-email')) L.push('Email: ' + g('q-email'));
    if (g('q-cat')) L.push('Category: ' + g('q-cat')); if (g('q-loc')) L.push('Delivery location: ' + g('q-loc'));
    if (g('q-qty')) L.push('Overall quantity: ' + g('q-qty')); if (g('q-dim')) L.push('Dimensions: ' + g('q-dim'));
    L.push('Requirements: ' + g('q-req'));
    var items = $$('#q-items > div').map(function (d) { return { n: $('[data-i=n]', d).value.trim(), q: $('[data-i=q]', d).value.trim(), x: $('[data-i=x]', d).value.trim() }; }).filter(function (i) { return i.n; });
    if (items.length) { L.push('Products:'); items.forEach(function (i) { L.push('- ' + i.n + (i.q ? ' x ' + i.q : '') + (i.x ? ' (' + i.x + ')' : '')); }); }
    if (g('q-msg')) L.push('Message: ' + g('q-msg'));
    window.open(waUrl(L.join('\n')), '_blank', 'noopener');
    done(qform, 'Opening WhatsApp with your quotation request…');
  });

  var cform = $('#cform');
  cform.addEventListener('submit', function (e) {
    e.preventDefault();
    var g = function (id) { return $('#' + id, cform).value.trim(); };
    if (!g('c-name') || digits(g('c-phone')).length < 7 || !g('c-msg')) return showErr(cform, 'Please fill in your name, a valid phone number and a message.');
    window.open(waUrl('Hello ' + D.business + ',\nName: ' + g('c-name') + '\nPhone: ' + g('c-phone') + '\nMessage: ' + g('c-msg')), '_blank', 'noopener');
    done(cform, 'Opening WhatsApp with your message…');
  });

  route(); refresh();
})();
