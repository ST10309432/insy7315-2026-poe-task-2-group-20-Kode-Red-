// Truck status and app settings (single-row tables). Owner: Boipelo.
const { query } = require('../config/db');
const db = client => client || { query };

module.exports = {
  getSettings: client =>
    db(client).query(`SELECT default_credit_limit AS "defaultCreditLimit", service_fee AS "serviceFee",
                      rands_per_point AS "randsPerPoint", point_value AS "pointValue",
                      free_meal_every AS "freeMealEvery", free_meal_cap AS "freeMealCap" FROM settings WHERE id = 1`).then(r => r.rows[0]),

  updateSettings: s =>
    query(`UPDATE settings SET default_credit_limit = COALESCE($1, default_credit_limit),
             service_fee = COALESCE($2, service_fee), rands_per_point = COALESCE($3, rands_per_point),
             point_value = COALESCE($4, point_value), free_meal_every = COALESCE($5, free_meal_every),
             free_meal_cap = COALESCE($6, free_meal_cap) WHERE id = 1`,
    [s.defaultCreditLimit ?? null, s.serviceFee ?? null, s.randsPerPoint ?? null,
      s.pointValue ?? null, s.freeMealEvery ?? null, s.freeMealCap ?? null]),

  getTruck: () =>
    query(`SELECT is_open AS "isOpen", location_name AS "locationName", latitude, longitude, hours, phone,
             updated_at AS "updatedAt" FROM truck_status WHERE id = 1`).then(r => r.rows[0]),

  updateTruck: t =>
    query(`UPDATE truck_status SET is_open = COALESCE($1, is_open), location_name = COALESCE($2, location_name),
             latitude = COALESCE($3, latitude), longitude = COALESCE($4, longitude), hours = COALESCE($5, hours),
             updated_at = NOW() WHERE id = 1`,
    [t.isOpen ?? null, t.locationName ?? null, t.latitude ?? null, t.longitude ?? null, t.hours ?? null]),
};
