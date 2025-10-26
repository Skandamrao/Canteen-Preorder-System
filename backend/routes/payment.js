const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../auth-helpers');

// Mock UPI payment: create intent and immediately succeed
router.post('/create', requireAuth, (req, res) => {
  const { order_id, method } = req.body;
  const order = db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(order_id, req.user.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const ref = 'UPI-' + Math.random().toString(36).slice(2,10).toUpperCase();
  const info = db.prepare('INSERT INTO payments (order_id, method, amount, status, reference) VALUES (?, ?, ?, ?, ?)')
    .run(order_id, method || 'UPI', order.total, 'SUCCESS', ref);
  res.json({ payment_id: info.lastInsertRowid, status: 'SUCCESS', reference: ref });
});

module.exports = router;
