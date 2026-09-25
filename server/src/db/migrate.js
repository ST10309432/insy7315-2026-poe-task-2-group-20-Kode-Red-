// Creates the schema and (with --seed) loads demo data.
// Usage: npm run db:migrate   |   npm run db:seed
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const MENU = [
  // name, description, category, price, sale, prep, extras
  ['Bunny / Kota (Quarter)', 'Bread, chips, polony, atchar', 'KOTA', 35, null, 10,
    [['Extra polony', 5], ['Cheese slice', 6], ['Extra chips', 8], ['Chilli sauce', 0]]],
  ['Half Kota Special', 'Chips, russian, cheese, egg', 'KOTA', 55, null, 12,
    [['Extra polony', 5], ['Cheese slice', 6], ['Extra chips', 8], ['Chilli sauce', 0]]],
  ['Full House Kota', 'The works: everything on', 'KOTA', 75, 60, 15,
    [['Extra russian', 10], ['Extra cheese', 6], ['Extra egg', 5], ['Chilli sauce', 0]]],
  ['Slap Chips (Small)', 'Soft vinegar chips', 'CHIPS', 20, null, 6, [['Chilli salt', 0], ['Cheese sauce', 7]]],
  ['Slap Chips (Large)', 'Big box of soft vinegar chips', 'CHIPS', 30, null, 8, [['Chilli salt', 0], ['Cheese sauce', 7]]],
  ['Coke 440ml', 'Ice cold', 'DRINK', 15, null, 1, []],
  ['Fanta Orange 440ml', 'Ice cold', 'DRINK', 15, null, 1, []],
  ['Still Water 500ml', 'Bottled water', 'DRINK', 12, null, 1, []],
  ['Kota + Chips + Coke', 'Lunch combo deal', 'COMBO', 80, null, 14, [['Upgrade to large chips', 8]]],
];

const USERS = [
  // fullName, email, role, studentNumber, verified, wallet, outstanding
  ['Thabang Phala', 'admin@thabangphala.co.za', 'ADMIN', null, true, 0, 0],
  ['Truck Staff', 'vendor@thabangphala.co.za', 'VENDOR', null, true, 0, 0],
  ['Lerato Mokoena', 'lerato@vcconnect.edu.za', 'STUDENT', 'ST20461', true, 120, 90],
  ['Sipho Dlamini', 'sipho@vcconnect.edu.za', 'STUDENT', 'ST20512', true, 45, 150],
  ['Naledi Khumalo', 'naledi@vcconnect.edu.za', 'STUDENT', 'ST20587', true, 200, 0],
  ['Kabelo Phiri', 'kabelo@vcconnect.edu.za', 'STUDENT', 'ST20690', false, 0, 0],
  ['Guest Visitor', 'guest@example.com', 'GUEST', null, false, 0, 0],
];
const DEMO_PASSWORD = 'Password123!';

async function migrate(client) {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await client.query(sql);
  // Then apply numbered migrations in order (002_..., 003_...)
  const dir = path.join(__dirname, 'migrations');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort() : [];
  for (const file of files) await client.query(fs.readFileSync(path.join(dir, file), 'utf8'));
  console.log(`Schema created (${files.length} migration${files.length === 1 ? '' : 's'} applied)`);
}

async function seed(client) {
  await client.query(`INSERT INTO settings (id) VALUES (1)`);
  await client.query(
    `INSERT INTO truck_status (is_open, location_name, latitude, longitude, hours, phone)
     VALUES (TRUE, 'Varsity College Campus – main gate', -26.106700, 28.056000, 'Mon–Fri 08:00–17:00 · Sat 09:00–14:00', '+27 71 000 0000')`
  );

  const itemIds = {};
  for (const [name, description, category, price, sale, prep, extras] of MENU) {
    const { rows } = await client.query(
      `INSERT INTO menu_items (name, description, category, price, sale_price, prep_minutes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING item_id`,
      [name, description, category, price, sale, prep]
    );
    itemIds[name] = rows[0].item_id;
    for (const [extra, extraPrice] of extras) {
      await client.query(`INSERT INTO menu_extras (item_id, name, price) VALUES ($1,$2,$3)`,
        [rows[0].item_id, extra, extraPrice]);
    }
  }
  // Demo: water is sold out for today only (comes back automatically after midnight)
  await client.query(`UPDATE menu_items SET available = FALSE, sold_out_on = (NOW() AT TIME ZONE 'Africa/Johannesburg')::date
                      WHERE name = 'Still Water 500ml'`);

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userIds = {};
  for (const [fullName, email, role, studentNumber, verified, wallet, outstanding] of USERS) {
    const { rows } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role, student_number, campus, verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING user_id`,
      [fullName, email, hash, role, studentNumber, studentNumber ? 'Varsity College Sandton' : null, verified]
    );
    const id = rows[0].user_id;
    userIds[email] = id;
    if (role === 'STUDENT') {
      await client.query(`INSERT INTO wallets (user_id, balance, last_top_up) VALUES ($1,$2,NOW())`, [id, wallet]);
      await client.query(
        `INSERT INTO credit_accounts (user_id, credit_limit, outstanding_balance, due_date)
         VALUES ($1, 200, $2, date_trunc('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day')`,
        [id, outstanding]
      );
      if (wallet > 0) {
        await client.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, description, created_at)
           VALUES ($1,'TOP_UP',$2,'Wallet top-up · Card', NOW() - INTERVAL '2 days')`, [id, wallet]);
      }
    }
  }

  // A week of historic orders so the dashboard and reports have data
  const students = ['lerato@vcconnect.edu.za', 'sipho@vcconnect.edu.za', 'naledi@vcconnect.edu.za'];
  const combos = [
    [['Half Kota Special', 2], ['Coke 440ml', 1]],
    [['Full House Kota', 1]],
    [['Kota + Chips + Coke', 1]],
    [['Bunny / Kota (Quarter)', 2], ['Slap Chips (Large)', 1]],
    [['Half Kota Special', 1], ['Slap Chips (Small)', 1], ['Fanta Orange 440ml', 1]],
  ];
  const prices = Object.fromEntries(MENU.map(m => [m[0], m[4] || m[3]]));
  const methods = ['CARD', 'WALLET', 'CREDIT'];
  let n = 0;
  for (let day = 6; day >= 0; day--) {
    const perDay = 4 + ((day * 3) % 5);
    for (let i = 0; i < perDay; i++, n++) {
      const combo = combos[n % combos.length];
      const subtotal = combo.reduce((s, [name, q]) => s + prices[name] * q, 0);
      const isToday = day === 0;
      const status = isToday ? ['PLACED', 'PREPARING', 'READY', 'COLLECTED'][i % 4] : 'COLLECTED';
      const at = `NOW() - INTERVAL '${day} days' - INTERVAL '${(i + 1) * 25} minutes'`;
      const { rows } = await client.query(
        `INSERT INTO orders (user_id, collection_time, status, subtotal, service_fee, total, created_at, updated_at)
         VALUES ($1, ${at} + INTERVAL '15 minutes', $2, $3, 2, $4, ${at}, ${at}) RETURNING order_id`,
        [userIds[students[n % 3]], status, subtotal, subtotal + 2]
      );
      for (const [name, q] of combo) {
        await client.query(
          `INSERT INTO order_items (order_id, item_id, item_name, quantity, unit_price, line_total)
           VALUES ($1,$2,$3,$4,$5,$6)`, [rows[0].order_id, itemIds[name], name, q, prices[name], prices[name] * q]);
      }
      await client.query(`INSERT INTO payments (order_id, method, amount, created_at) VALUES ($1,$2,$3, ${at})`,
        [rows[0].order_id, methods[n % 3], subtotal + 2]);
    }
  }
  // Loyalty history for the demo students, derived from their seeded orders
  await client.query(`UPDATE orders SET points_earned = FLOOR(total / 10)::int`);
  await client.query(`UPDATE users u SET loyalty_points = s.points, free_meals = s.orders / 10
    FROM (SELECT user_id, SUM(points_earned)::int AS points, COUNT(*)::int AS orders FROM orders GROUP BY user_id) s
    WHERE s.user_id = u.user_id`);
  console.log(`Seeded menu, ${USERS.length} users (password: ${DEMO_PASSWORD}) and ${n} orders`);
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await migrate(client);
    if (process.argv.includes('--seed')) await seed(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) main();
module.exports = { migrate, seed, DEMO_PASSWORD };
