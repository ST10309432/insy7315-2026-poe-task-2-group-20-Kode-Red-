/** Round to 2 decimal places (cents) to avoid floating point drift. */
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
module.exports = { round2 };
