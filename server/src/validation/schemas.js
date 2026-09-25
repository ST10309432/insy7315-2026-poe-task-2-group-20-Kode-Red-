// Request validation rules (zod). Shared by routes; extended by Molemo (security).
const { z } = require('zod');

const money = z.coerce.number().positive().max(100000).transform(n => Math.round(n * 100) / 100);
const trimmed = (min, max) => z.string().trim().min(min).max(max);

const register = z.object({
  fullName: trimmed(2, 100),
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72)
    .regex(/[A-Za-z]/, 'Password needs a letter').regex(/[0-9]/, 'Password needs a number'),
  studentNumber: z.string().trim().toUpperCase().regex(/^ST\d{5,8}$/, 'Student number looks like ST10309432').optional()
    .or(z.literal('').transform(() => undefined)),
  campus: trimmed(2, 100).optional(),
  phone: z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, 'Enter a valid phone number').optional(),
});

const login = z.object({
  email: z.email('Enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Enter your password'),
});

const updateProfile = z.object({
  fullName: trimmed(2, 100).optional(),
  phone: z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, 'Enter a valid phone number').optional(),
  campus: trimmed(2, 100).optional(),
}).refine(o => Object.keys(o).length > 0, 'Nothing to update');

const category = z.enum(['KOTA', 'CHIPS', 'DRINK', 'COMBO']);

const menuItem = z.object({
  name: trimmed(2, 80),
  description: z.string().trim().max(255).default(''),
  category,
  price: money,
  salePrice: money.nullable().optional(),
  available: z.boolean().default(true),
  prepMinutes: z.coerce.number().int().min(1).max(120).default(10),
  extras: z.array(z.object({ name: trimmed(1, 60), price: z.coerce.number().min(0).max(1000) })).max(15).optional(),
});

const menuQuery = z.object({ category: category.optional() });
const availability = z.object({
  available: z.boolean(),
  // TODAY: sold out until midnight (default). UNTIL_CHANGED: stays off until turned back on.
  scope: z.enum(['TODAY', 'UNTIL_CHANGED']).default('TODAY'),
});
const idParam = z.object({ id: z.coerce.number().int().positive() });

const placeOrder = z.object({
  items: z.array(z.object({
    itemId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(1).max(20),
    extraIds: z.array(z.coerce.number().int().positive()).max(10).default([]),
  })).min(1, 'Your cart is empty').max(30),
  paymentMethod: z.enum(['WALLET', 'CREDIT', 'CARD']),
  collectionTime: z.union([z.literal('ASAP'), z.iso.datetime({ offset: true })]).default('ASAP'),
  usePoints: z.coerce.number().int().min(0).max(100000).default(0),
  useFreeMeal: z.boolean().default(false),
});

const review = z.object({
  rating: z.coerce.number().int().min(1, 'Choose 1 to 5 stars').max(5),
  comment: z.string().trim().max(300, 'Keep it under 300 characters').default(''),
});

const becomeStudent = z.object({
  studentNumber: z.string().trim().toUpperCase().regex(/^ST\d{5,8}$/, 'Student number looks like ST10309432'),
  campus: trimmed(2, 100).default('Varsity College Sandton'),
});

const creditStatus = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });
const notificationParam = z.object({ id: z.coerce.number().int().positive() });
const reviewsQuery = z.object({ limit: z.coerce.number().int().min(1).max(20).default(6) });

const orderStatus = z.object({
  status: z.enum(['ACCEPTED', 'PREPARING', 'READY', 'COLLECTED', 'CANCELLED']),
});
const orderNumberParam = z.object({ orderNumber: z.string().regex(/^TP-\d+$/, 'Invalid order number') });
const queueQuery = z.object({ scope: z.enum(['active', 'today']).default('active') });

const topUp = z.object({ amount: money.refine(n => n >= 10 && n <= 2000, 'Top-ups must be between R10 and R2000') });
const repay = z.object({ amount: money, source: z.enum(['WALLET', 'CARD']).default('CARD') });

const verify = z.object({ verified: z.boolean() });
const creditLimit = z.object({ creditLimit: z.coerce.number().min(0).max(5000) });
const settings = z.object({
  defaultCreditLimit: z.coerce.number().min(0).max(5000).optional(),
  serviceFee: z.coerce.number().min(0).max(50).optional(),
  randsPerPoint: z.coerce.number().int().min(1).max(1000).optional(),
  pointValue: z.coerce.number().min(0.01).max(100).optional(),
  freeMealEvery: z.coerce.number().int().min(1).max(100).optional(),
  freeMealCap: z.coerce.number().min(1).max(1000).optional(),
});
const truck = z.object({
  isOpen: z.boolean().optional(),
  locationName: trimmed(2, 120).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  hours: trimmed(2, 120).optional(),
});
const reportQuery = z.object({ days: z.coerce.number().int().min(1).max(90).default(7) });

module.exports = { register, login, updateProfile, menuItem, menuQuery, availability, idParam, placeOrder,
  orderStatus, orderNumberParam, queueQuery, topUp, repay, verify, creditLimit, settings, truck, reportQuery,
  review, becomeStudent, creditStatus, notificationParam, reviewsQuery };
