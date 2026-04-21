// ============================================================
//  FarmLink - Backend (PostgreSQL Version)
// ============================================================

require('dotenv').config();

console.log("🔥 STARTING SERVER FILE");

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'farmlink_secure_jwt_secret_2024_pcl6';

console.log("🔥 Imports loaded");

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000
});

console.log("🔥 Pool created");

// Test connection
(async () => {
  console.log("🔥 Trying DB connection...");
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected:', res.rows[0]);
  } catch (err) {
    console.error('❌ DB connection error:', err.message);
  }
})();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ================= AUTH =================

// Register
app.post('/api/register', async (req, res) => {
  const { full_name, phone, location, user_type, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (full_name, phone, location, user_type, password)
       VALUES ($1, $2, $3, $4, $5)`,
      [full_name, phone, location, user_type, hashed]
    );

    res.json({ success: true, message: 'Registration successful' });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: 'Phone already exists' });
    }
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { phone, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone=$1',
      [phone]
    );

    const user = result.rows[0];
    if (!user) return res.status(401).json({ success: false });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false });

    const token = jwt.sign(user, JWT_SECRET);

    res.json({ success: true, token, user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ================= CROPS =================

// ✅ FIXED: Now includes farmer name
app.get('/api/crops', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        crops.*,
        users.full_name AS farmer_name
      FROM crops
      JOIN users ON crops.phone = users.phone
      ORDER BY crops.created_at DESC
    `);

    res.json({ success: true, crops: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post('/api/crops', async (req, res) => {
  const { crop_name, quantity, price_per_kg, location, phone } = req.body;

  try {
    await pool.query(
      `INSERT INTO crops (crop_name, quantity, price_per_kg, location, phone)
       VALUES ($1,$2,$3,$4,$5)`,
      [crop_name, quantity, price_per_kg, location, phone]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ================= PRODUCTS =================

app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products ORDER BY created_at DESC'
    );
    res.json({ success: true, products: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post('/api/products', async (req, res) => {
  const { product_name, price, description, location, phone } = req.body;

  try {
    await pool.query(
      `INSERT INTO products (product_name, price, description, location, phone)
       VALUES ($1,$2,$3,$4,$5)`,
      [product_name, price, description, location, phone]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ================= START =================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
