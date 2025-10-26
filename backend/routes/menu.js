const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth-helpers');

// Public: list menu
router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM menu_items WHERE available=1 ORDER BY id DESC').all();
  res.json(items);
});

// Admin: add item
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, description, price, image, available } = req.body;
  const stmt = db.prepare('INSERT INTO menu_items (name, description, price, image, available) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(name, description || '', Number(price), image || '', available ? 1 : 1);
  const item = db.prepare('SELECT * FROM menu_items WHERE id=?').get(info.lastInsertRowid);
  res.json(item);
});

// Admin: update item
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const id = req.params.id;
  const { name, description, price, image, available } = req.body;
  db.prepare('UPDATE menu_items SET name=?, description=?, price=?, image=?, available=? WHERE id=?')
    .run(name, description || '', Number(price), image || '', available ? 1 : 0, id);
  const item = db.prepare('SELECT * FROM menu_items WHERE id=?').get(id);
  res.json(item);
});

// Admin: delete
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM menu_items WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
