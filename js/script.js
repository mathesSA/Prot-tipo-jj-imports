// ---------- Theme toggle (light/dark) ----------
const Theme = {
  key: 'jj_theme',
  get(){ try{ return localStorage.getItem(this.key) || 'dark'; }catch(e){ return 'dark'; } },
  set(t){ try{ localStorage.setItem(this.key, t); }catch(e){} document.documentElement.setAttribute('data-theme', t); this.syncIcons(t); },
  syncIcons(t){
    document.querySelectorAll('.theme-toggle').forEach(btn => btn.textContent = t === 'light' ? '🌙' : '☀️');
  }
};
document.addEventListener('DOMContentLoaded', () => Theme.syncIcons(Theme.get()));
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-toggle');
  if(!btn) return;
  Theme.set(Theme.get() === 'light' ? 'dark' : 'light');
});

// ---------- Cart state (persisted for the prototype only) ----------
const Cart = {
  key: 'jj_cart',
  read(){ try{ return JSON.parse(localStorage.getItem(this.key)) || []; }catch(e){ return []; } },
  write(items){ localStorage.setItem(this.key, JSON.stringify(items)); this.updateBadge(); },
  add(item){
    const items = this.read();
    const found = items.find(i => i.id === item.id && i.size === item.size);
    if(found) found.qty += item.qty; else items.push(item);
    this.write(items);
  },
  remove(id, size){
    this.write(this.read().filter(i => !(i.id === id && i.size === size)));
  },
  setQty(id, size, qty){
    const items = this.read();
    const found = items.find(i => i.id === id && i.size === size);
    if(found){ found.qty = Math.max(1, qty); this.write(items); }
  },
  count(){ return this.read().reduce((s,i) => s + i.qty, 0); },
  subtotal(){ return this.read().reduce((s,i) => s + i.qty * i.price, 0); },
  updateBadge(){
    document.querySelectorAll('.js-cart-count').forEach(el => el.textContent = this.count());
  }
};
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());

// ---------- Toast ----------
function showToast(msg){
  let toast = document.querySelector('.toast');
  if(!toast){
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>🛍️</span><span>${msg}</span>`;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 2600);
}

// ---------- Quick add from product cards ----------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.quick-add');
  if(!btn) return;
  const card = btn.closest('[data-id]');
  if(!card) return;
  Cart.add({
    id: card.dataset.id,
    name: card.dataset.name,
    price: parseFloat(card.dataset.price),
    size: 'Único',
    qty: 1,
    glyph: card.dataset.glyph || '👟'
  });
  showToast(`${card.dataset.name} adicionado ao carrinho`);
});

// ---------- Wishlist heart toggle ----------
document.addEventListener('click', (e) => {
  const wish = e.target.closest('.wish');
  if(!wish) return;
  wish.classList.toggle('active');
  wish.textContent = wish.classList.contains('active') ? '♥' : '♡';
});
document.querySelectorAll('.wish').forEach(w => w.textContent = w.classList.contains('active') ? '♥' : '♡');

// ---------- Countdown timer ----------
function startCountdown(el){
  let total = parseInt(el.dataset.seconds || '14400', 10);
  const h = el.querySelector('.cd-h'), m = el.querySelector('.cd-m'), s = el.querySelector('.cd-s');
  function tick(){
    if(total <= 0){ total = parseInt(el.dataset.seconds || '14400', 10); }
    const hh = Math.floor(total/3600), mm = Math.floor((total%3600)/60), ss = total%60;
    if(h) h.textContent = String(hh).padStart(2,'0');
    if(m) m.textContent = String(mm).padStart(2,'0');
    if(s) s.textContent = String(ss).padStart(2,'0');
    total--;
  }
  tick();
  setInterval(tick, 1000);
}
document.querySelectorAll('.countdown').forEach(startCountdown);

// ---------- Product detail: gallery, sizes, qty, tabs ----------
document.querySelectorAll('.thumbs div').forEach(thumb => {
  thumb.addEventListener('click', () => {
    thumb.parentElement.querySelectorAll('div').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
    const main = document.querySelector('.gallery-main .glyph');
    if(main) main.textContent = thumb.textContent;
  });
});

document.querySelectorAll('.pdp-sizes').forEach(group => {
  group.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

document.querySelectorAll('.qty').forEach(q => {
  const span = q.querySelector('span');
  let val = 1;
  q.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      val = btn.dataset.action === 'inc' ? val + 1 : Math.max(1, val - 1);
      span.textContent = val;
      q.dataset.qty = val;
    });
  });
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabs = btn.closest('.pdp-info, .section');
    tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    tabs.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    tabs.querySelector('#' + btn.dataset.tab).classList.add('active');
  });
});

const pdpAddBtn = document.querySelector('.js-pdp-add');
if(pdpAddBtn){
  pdpAddBtn.addEventListener('click', () => {
    const activeSize = document.querySelector('.pdp-sizes button.active');
    const qtyEl = document.querySelector('.qty');
    Cart.add({
      id: pdpAddBtn.dataset.id,
      name: pdpAddBtn.dataset.name,
      price: parseFloat(pdpAddBtn.dataset.price),
      size: activeSize ? activeSize.textContent : 'Único',
      qty: qtyEl ? parseInt(qtyEl.dataset.qty || '1', 10) : 1,
      glyph: pdpAddBtn.dataset.glyph || '👟'
    });
    showToast('Adicionado ao carrinho!');
  });
}

// ---------- Cart page rendering ----------
function money(v){ return v.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}); }

const cartList = document.querySelector('.js-cart-list');
if(cartList){
  function render(){
    const items = Cart.read();
    cartList.innerHTML = '';
    if(items.length === 0){
      cartList.innerHTML = `<div style="padding:60px 0;text-align:center;color:var(--muted)">
        <div style="font-size:3rem;margin-bottom:14px">🛒</div>
        <p>Seu carrinho está vazio.</p>
        <a href="produtos.html" class="btn btn-primary" style="margin-top:18px;display:inline-flex">Ver produtos</a>
      </div>`;
    } else {
      items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
          <div class="thumb">${item.glyph}</div>
          <div>
            <h4>${item.name}</h4>
            <div class="meta">Tamanho: ${item.size}</div>
            <div class="row-bottom">
              <div class="qty" data-id="${item.id}" data-size="${item.size}">
                <button data-action="dec">−</button><span>${item.qty}</span><button data-action="inc">+</button>
              </div>
              <button class="remove-btn" data-remove="${item.id}" data-size="${item.size}">Remover</button>
            </div>
          </div>
          <div class="price">${money(item.price * item.qty)}</div>`;
        cartList.appendChild(row);
      });
    }
    const subtotal = Cart.subtotal();
    const shipping = subtotal > 0 && subtotal < 299 ? 24.90 : 0;
    const pixDiscount = subtotal * 0.1;
    document.querySelectorAll('.js-subtotal').forEach(el => el.textContent = money(subtotal));
    document.querySelectorAll('.js-shipping').forEach(el => el.textContent = shipping === 0 ? 'Grátis' : money(shipping));
    document.querySelectorAll('.js-pixdiscount').forEach(el => el.textContent = '- ' + money(pixDiscount));
    document.querySelectorAll('.js-total').forEach(el => el.textContent = money(subtotal + shipping - pixDiscount));

    const bar = document.querySelector('.bar div');
    const barText = document.querySelector('.js-ship-text');
    if(bar){
      const goal = 299;
      const pct = Math.min(100, (subtotal/goal)*100);
      bar.style.width = pct + '%';
      if(barText){
        barText.innerHTML = subtotal >= goal
          ? `Você garantiu <b>frete grátis</b>! 🎉`
          : `Faltam <b>${money(goal - subtotal)}</b> para ganhar frete grátis`;
      }
    }
  }
  cartList.addEventListener('click', (e) => {
    const rem = e.target.closest('[data-remove]');
    if(rem){ Cart.remove(rem.dataset.remove, rem.dataset.size); render(); return; }
    const btn = e.target.closest('.qty button');
    if(btn){
      const qtyBox = btn.closest('.qty');
      const items = Cart.read();
      const item = items.find(i => i.id === qtyBox.dataset.id && i.size === qtyBox.dataset.size);
      if(item){
        const next = btn.dataset.action === 'inc' ? item.qty + 1 : item.qty - 1;
        if(next <= 0){ Cart.remove(item.id, item.size); } else { Cart.setQty(item.id, item.size, next); }
        render();
      }
    }
  });
  render();
}

// ---------- Checkout: payment method switcher + summary ----------
document.querySelectorAll('.pay-method').forEach(pm => {
  pm.addEventListener('click', () => {
    document.querySelectorAll('.pay-method').forEach(p => p.classList.remove('active'));
    pm.classList.add('active');
  });
});

const checkoutSummary = document.querySelector('.js-checkout-summary');
if(checkoutSummary){
  const subtotal = Cart.subtotal() || 899.80;
  const shipping = subtotal >= 299 ? 0 : 24.90;
  document.querySelectorAll('.js-co-subtotal').forEach(el => el.textContent = money(subtotal));
  document.querySelectorAll('.js-co-shipping').forEach(el => el.textContent = shipping === 0 ? 'Grátis' : money(shipping));
  document.querySelectorAll('.js-co-total').forEach(el => el.textContent = money(subtotal + shipping));
  document.querySelectorAll('.js-co-total-pix').forEach(el => el.textContent = money((subtotal * 0.9) + shipping));
}

const placeOrderBtn = document.querySelector('.js-place-order');
if(placeOrderBtn){
  placeOrderBtn.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.setItem('jj_cart', '[]');
    window.location.href = 'confirmacao.html';
  });
}

// ---------- Mobile filters toggle ----------
const filterToggle = document.querySelector('.js-filter-toggle');
if(filterToggle){
  filterToggle.addEventListener('click', () => {
    document.querySelector('.filters').classList.toggle('open');
  });
}
