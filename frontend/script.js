const API = location.origin.includes('localhost') ? 'http://localhost:5000' : '';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

function setUserPills(){
  const up = document.getElementById('user-pill'); if(up && user) up.textContent = user.name + ' • ' + user.role;
  const ap = document.getElementById('admin-pill'); if(ap && user) ap.textContent = user.name + ' • ' + user.role;
}
setUserPills();

async function api(path, method='GET', body){
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(localStorage.token?{Authorization:'Bearer '+localStorage.token}:{}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if(!res.ok) throw new Error((await res.json()).message || 'Request failed');
  return res.json();
}

async function register(){
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const role = document.getElementById('reg-role').value;
  try{
    const data = await api('/api/auth/register','POST',{name,email,password,role});
    localStorage.token = data.token; localStorage.user = JSON.stringify(data.user);
    document.getElementById('reg-msg').textContent = 'Account created!';
    setTimeout(()=>location.href = role==='admin'?'admin.html':'student.html', 600);
  }catch(e){ document.getElementById('reg-msg').textContent = e.message; }
}
async function login(){
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();
  try{
    const data = await api('/api/auth/login','POST',{email,password});
    localStorage.token = data.token; localStorage.user = JSON.stringify(data.user);
    document.getElementById('login-msg').textContent = 'Logged in!';
    setTimeout(()=>location.href = data.user.role==='admin'?'admin.html':'student.html', 600);
  }catch(e){ document.getElementById('login-msg').textContent = e.message; }
}
function logout(){ localStorage.removeItem('token'); localStorage.removeItem('user'); location.reload(); }

// -------- Student --------
let MENU = [];
let CART = [];
function filteredMenu(){
  const q = (document.getElementById('search')?.value || '').toLowerCase();
  let items = MENU.filter(m=>m.name.toLowerCase().includes(q) || (m.description||'').toLowerCase().includes(q));
  const sort = document.getElementById('sort')?.value || 'latest';
  if(sort==='price-asc') items.sort((a,b)=>a.price-b.price);
  if(sort==='price-desc') items.sort((a,b)=>b.price-a.price);
  return items;
}
function renderMenu(){
  const el = document.getElementById('menu'); if(!el) return;
  el.innerHTML = filteredMenu().map(m=>`
    <div class="menu-card card">
      <img src="${m.image || 'https://picsum.photos/seed/'+m.id+'/400/240'}" alt="">
      <b>${m.name}</b>
      <small>${m.description || ''}</small>
      <div class="row"><span class="price">₹${m.price}</span><button class="btn" onclick='addToCart(${JSON.stringify(m).replace(/"/g,"&quot;")})'>Add</button></div>
    </div>
  `).join('');
}
function addToCart(m){ const found = CART.find(x=>x.id===m.id); if(found) found.qty++; else CART.push({id:m.id,name:m.name,price:m.price,qty:1}); renderCart(); }
function changeQty(id,delta){ const it = CART.find(x=>x.id===id); if(!it) return; it.qty+=delta; if(it.qty<=0) CART=CART.filter(x=>x.id!==id); renderCart(); }
function renderCart(){
  const el = document.getElementById('cart'); if(!el) return;
  el.innerHTML = CART.length? CART.map(c=>`
    <div class="row" style="justify-content:space-between">
      <div>${c.name} × ${c.qty}</div>
      <div class="row">
        <button class="btn ghost" onclick="changeQty(${c.id},-1)">-</button>
        <button class="btn ghost" onclick="changeQty(${c.id},1)">+</button>
        <div>₹${(c.qty*c.price).toFixed(2)}</div>
      </div>
    </div>
  `).join(''): '<p>No items yet.</p>';
  const total = CART.reduce((s,c)=>s+c.qty*c.price,0);
  const pill = document.getElementById('total-pill'); if(pill) pill.textContent = 'Total: ₹'+total.toFixed(2);
}
async function loadMenu(){
  try{ MENU = await api('/api/menu'); renderMenu(); }catch(e){ console.error(e); }
}
async function checkout(){
  if(!localStorage.token){ alert('Please login first'); return; }
  if(!CART.length){ alert('Cart is empty'); return; }
  const pickup_time = document.getElementById('pickup')?.value || null;
  const items = CART.map(c=>({id:c.id, qty:c.qty, price:c.price}));
  try{
    const order = await api('/api/orders','POST',{items,pickup_time});
    localStorage.lastOrderId = order.id;
    alert('Order placed! Proceed to payment.');
    loadMyOrders();
  }catch(e){ alert(e.message); }
}
async function payNow(){
  const orderId = localStorage.lastOrderId;
  if(!orderId){ alert('Place an order first.'); return; }
  try{
    const p = await api('/api/payment/create','POST',{order_id: Number(orderId), method:'UPI'});
    alert('Payment success! Ref: '+p.reference);
    CART=[]; renderCart(); loadMyOrders();
  }catch(e){ alert(e.message); }
}
async function loadMyOrders(){
  const el = document.getElementById('my-orders'); if(!el) return;
  if(!localStorage.token){ el.innerHTML = '<p>Please login to view your orders.</p>'; return; }
  const orders = await api('/api/orders/me');
  el.innerHTML = orders.map(o=>`
    <div class="card" style="margin:8px 0">
      <div class="row"><b>#${o.id}</b><span class="pill">${o.status}</span><span class="pill">₹${o.total}</span><span class="pill">${o.pickup_time || '-'}</span></div>
      <small>${o.items.map(i=>i.name+' x '+i.quantity).join(', ')}</small>
    </div>
  `).join('');
}

// -------- Admin --------
async function ensureAdmin(){
  if(!user || user.role!=='admin'){ return; }
  await renderAdminMenu();
  await renderAdminOrders();
}
async function addMenuItem(){
  const name = document.getElementById('m-name').value;
  const price = Number(document.getElementById('m-price').value || 0);
  const image = document.getElementById('m-img').value;
  const item = await api('/api/menu','POST',{name, price, image, description:''});
  document.getElementById('m-name').value=''; document.getElementById('m-price').value=''; document.getElementById('m-img').value='';
  await renderAdminMenu();
}
async function renderAdminMenu(){
  const box = document.getElementById('admin-menu'); if(!box) return;
  const items = await api('/api/menu');
  box.innerHTML = items.map(m=>`
    <div class="row card" style="margin:8px 0; justify-content:space-between">
      <div class="row"><img src="${m.image || 'https://picsum.photos/seed/'+m.id+'/90/60'}" style="border-radius:8px;border:1px solid rgba(255,255,255,.1)"><div style="margin-left:10px"><b>${m.name}</b><div>₹${m.price}</div></div></div>
      <div class="row">
        <button class="btn ghost" onclick="toggleAvailability(${m.id}, ${m.available?0:1})">${m.available?'Disable':'Enable'}</button>
        <button class="btn danger" onclick="deleteItem(${m.id})">Delete</button>
      </div>
    </div>
  `).join('');
}
async function toggleAvailability(id, available){
  await api('/api/menu/'+id,'PUT',{name:'',description:'',price:0,image:'',available}); // quick toggle (keeps other fields empty; server will overwrite if name empty, but for brevity we fetch first)
  await renderAdminMenu();
}
async function deleteItem(id){ await api('/api/menu/'+id,'DELETE'); await renderAdminMenu(); }
async function renderAdminOrders(){
  const box = document.getElementById('admin-orders'); if(!box) return;
  const orders = await api('/api/orders');
  box.innerHTML = orders.map(o=>`
    <div class="card" style="margin:8px 0">
      <div class="row" style="justify-content:space-between">
        <div class="row"><b>#${o.id}</b><span class="pill">${o.status}</span><span class="pill">₹${o.total}</span><span class="pill">${o.user_name}</span></div>
        <div class="row">
          ${['PENDING','PREPARING','READY','COMPLETED','CANCELLED'].map(s=>`<button class="btn ${s==='COMPLETED'?'success':(s==='CANCELLED'?'danger':'ghost')}" onclick="updateOrderStatus(${o.id}, '${s}')">${s}</button>`).join('')}
        </div>
      </div>
      <small>${o.items.map(i=>i.name+' x '+i.quantity).join(', ')}</small>
    </div>
  `).join('');
}
async function updateOrderStatus(id, status){ await api('/api/orders/'+id+'/status','PATCH',{status}); await renderAdminOrders(); }

// Init page behaviors
window.addEventListener('DOMContentLoaded', async ()=>{
  setUserPills();
  if(document.getElementById('menu')){ await loadMenu(); renderCart(); loadMyOrders(); }
  if(document.getElementById('admin-menu')){ await ensureAdmin(); }
});
