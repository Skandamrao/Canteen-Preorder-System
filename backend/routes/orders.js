const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth-helpers');

router.post('/', requireAuth, (req, res) => {
  const { items, pickup_time } = req.body; // items: [{id, qty, price}]
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Empty order' });
  const total = items.reduce((s, it) => s + (Number(it.price) * Number(it.qty)), 0);
  const info = db.prepare('INSERT INTO orders (user_id, status, total, pickup_time) VALUES (?, ?, ?, ?)')
    .run(req.user.id, 'PENDING', total, pickup_time || null);
  const orderId = info.lastInsertRowid;
  const stmt = db.prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)');
  const insertMany = db.transaction((rows) => {
    for (const r of rows) stmt.run(orderId, r.id, r.qty, r.price);
  });
  insertMany(items);
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
  res.json(order);
});

router.get('/me', requireAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC').all(req.user.id);
  const itemsStmt = db.prepare('SELECT oi.*, mi.name FROM order_items oi JOIN menu_items mi ON oi.menu_item_id=mi.id WHERE order_id=?');
  const withItems = orders.map(o => ({...o, items: itemsStmt.all(o.id)}));
  res.json(withItems);
});

// Admin: list all
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const orders = db.prepare('SELECT o.*, u.name as user_name, u.email as user_email FROM orders o JOIN users u ON o.user_id=u.id ORDER BY o.id DESC').all();
  const itemsStmt = db.prepare('SELECT oi.*, mi.name FROM order_items oi JOIN menu_items mi ON oi.menu_item_id=mi.id WHERE order_id=?');
  const withItems = orders.map(o => ({...o, items: itemsStmt.all(o.id)}));
  res.json(withItems);
});

// Admin: update status
router.patch('/:id/status', requireAuth, requireAdmin, (req, res) => {
  const { status } = req.body; // PENDING, PREPARING, READY, COMPLETED, CANCELLED
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, req.params.id);
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  res.json(order);
});

module.exports = router;
