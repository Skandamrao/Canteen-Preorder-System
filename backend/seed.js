const db = require('./db');
const bcrypt = require('bcryptjs');

function ensureAdmin() {
  const existing = db.prepare('SELECT * FROM users WHERE email=?').get('admin@canteen.local');
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)')
      .run('Admin', 'admin@canteen.local', hash, 'admin');
    console.log('✅ Admin created: admin@canteen.local / admin123');
  } else {
    console.log('ℹ️ Admin already exists.');
  }
}

function seedMenu() {
  const count = db.prepare('SELECT COUNT(*) as c FROM menu_items').get().c;
  if (count === 0) {
    const rows = [
      ['Masala Dosa','Crispy dosa with potato filling',60,'',1],
      ['Veg Biryani','Aromatic rice with veggies',90,'',1],
      ['Paneer Butter Masala','Rich creamy paneer curry',120,'',1],
      ['Cold Coffee','Iced coffee with milk',40,'',1],
      ['Samosa','Crispy stuffed triangles',15,'',1]
    ];
    const stmt = db.prepare('INSERT INTO menu_items (name, description, price, image, available) VALUES (?,?,?,?,?)');
    const tx = db.transaction(r=>r.forEach(v=>stmt.run(...v)));
    tx(rows);
    console.log('✅ Seeded menu items.');
  } else {
    console.log('ℹ️ Menu already has items.');
  }
}

ensureAdmin();
seedMenu();
console.log('✨ Seeding complete.');
process.exit(0);
