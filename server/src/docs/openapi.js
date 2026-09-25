// OpenAPI 3.1 description of the API, served as interactive docs at /api/docs.
// Request body schemas are generated from the zod validation rules, so the docs always match what the API accepts.
const { z } = require('zod');
const s = require('../validation/schemas');

const json = schema => z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
const body = (schema, example) => ({ required: true, content: { 'application/json': { schema: json(schema), ...(example && { example }) } } });
const ok = (description = 'OK') => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Success' } } } });
const err = description => ({ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } });
const auth = [{ bearerAuth: [] }];
const idParam = name => ({ name, in: 'path', required: true, schema: { type: name === 'orderNumber' ? 'string' : 'integer' }, ...(name === 'orderNumber' && { example: 'TP-1042' }) });
const std = { 400: err('Validation failed — see error.details'), 401: err('Not logged in or session expired') };
const staffOnly = { ...std, 403: err('Your role cannot do this') };

const op = (tag, summary, extra = {}) => ({ tags: [tag], summary, ...extra, responses: { 200: ok(), ...extra.responses } });

module.exports = {
  openapi: '3.1.0',
  info: {
    title: 'Thabang Phala API',
    version: '1.0.0',
    description: 'REST API for the Thabang Phala food truck ordering system (INSY7315 WIL, Group 20).\n\n'
      + 'All responses use `{ "data": ... }` on success and `{ "error": { "message", "details" } }` on failure.\n\n'
      + 'To try protected endpoints: call **POST /api/auth/login** (demo password `Password123!`, e.g. `admin@thabangphala.co.za`), '
      + 'copy `data.token`, click **Authorize** and paste it.',
  },
  servers: [{ url: '/', description: 'This server' }],
  tags: ['Auth', 'Menu', 'Orders', 'Wallet & credit', 'Notifications', 'Admin', 'Truck & public', 'System'].map(name => ({ name })),
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token from /api/auth/login (expires after 30 minutes)' } },
    schemas: {
      Success: { type: 'object', properties: { data: {} } },
      Error: { type: 'object', properties: { error: { type: 'object', properties: { message: { type: 'string' }, details: {} } } } },
    },
  },
  paths: {
    '/api/health': { get: op('System', 'Health check (API + database)', { responses: { 503: err('Database unreachable') } }) },

    '/api/auth/register': { post: op('Auth', 'Register (student number → student account, otherwise guest)', {
      requestBody: body(s.register, { fullName: 'Test Student', email: 'test@vcconnect.edu.za', password: 'Password123', studentNumber: 'ST10000001' }),
      responses: { 201: ok('Created — returns token and user'), 400: std[400], 409: err('Email already registered') } }) },
    '/api/auth/login': { post: op('Auth', 'Log in and get a JWT', {
      requestBody: body(s.login, { email: 'admin@thabangphala.co.za', password: 'Password123!' }),
      responses: { 401: err('Incorrect email or password'), 429: err('Too many attempts') } }) },
    '/api/auth/me': {
      get: op('Auth', 'Current user (points, free meals, order count)', { security: auth, responses: std }),
      patch: op('Auth', 'Update own details (FR-11)', { security: auth, requestBody: body(s.updateProfile), responses: std }),
    },
    '/api/auth/me/student': { post: op('Auth', 'Guest adds a student number (returns a new token)', { security: auth, requestBody: body(s.becomeStudent), responses: { ...std, 409: err('Not a guest account') } }) },

    '/api/menu': {
      get: op('Menu', 'List menu items with extras, photo URL and rating (FR-02)', { parameters: [{ name: 'category', in: 'query', schema: { type: 'string', enum: ['KOTA', 'CHIPS', 'DRINK', 'COMBO'] } }] }),
      post: op('Menu', 'Add a menu item (admin)', { security: auth, requestBody: body(s.menuItem), responses: { 201: ok('Created'), ...staffOnly } }),
    },
    '/api/menu/{id}': {
      get: op('Menu', 'One menu item', { parameters: [idParam('id')], responses: { 404: err('Not found') } }),
      put: op('Menu', 'Edit item, price, sale price and extras (admin)', { security: auth, parameters: [idParam('id')], requestBody: body(s.menuItem), responses: { ...staffOnly, 404: err('Not found') } }),
      delete: { tags: ['Menu'], summary: 'Delete item (admin; 409 if it has past orders)', security: auth, parameters: [idParam('id')], responses: { 204: { description: 'Deleted' }, ...staffOnly, 409: err('Item has orders — mark it unavailable instead') } },
    },
    '/api/menu/{id}/availability': { patch: op('Menu', 'Mark sold out for today or until changed (vendor/admin)', { security: auth, parameters: [idParam('id')], requestBody: body(s.availability, { available: false, scope: 'TODAY' }), responses: staffOnly }) },
    '/api/menu/{id}/image': {
      get: { tags: ['Menu'], summary: 'Item photo (cached, cross-origin)', parameters: [idParam('id')], responses: { 200: { description: 'The photo', content: { 'image/jpeg': {}, 'image/png': {}, 'image/webp': {} } }, 304: { description: 'Not modified' }, 404: err('No photo') } },
      put: op('Menu', 'Upload or replace the photo (admin). Body = raw JPEG/PNG/WebP, max 1 MB', { security: auth, parameters: [idParam('id')],
        requestBody: { required: true, content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } }, 'image/png': { schema: { type: 'string', format: 'binary' } }, 'image/webp': { schema: { type: 'string', format: 'binary' } } } },
        responses: { ...staffOnly, 413: err('Larger than 1 MB'), 415: err('Not a JPEG, PNG or WebP image') } }),
      delete: { tags: ['Menu'], summary: 'Remove the photo (admin)', security: auth, parameters: [idParam('id')], responses: { 204: { description: 'Removed' }, ...staffOnly } },
    },

    '/api/orders': {
      post: op('Orders', 'Place an order and pay (wallet, credit or card), optionally with points / free meal', { security: auth,
        requestBody: body(s.placeOrder, { items: [{ itemId: 2, quantity: 1, extraIds: [] }], paymentMethod: 'CARD', collectionTime: 'ASAP', usePoints: 0, useFreeMeal: false }),
        responses: { 201: ok('Created — returns the order with its TP- number'), ...std, 403: err('Wallet/credit need a (verified) student account'), 409: err('Item sold out or not enough points'), 422: err('Wallet balance too low or credit declined') } }),
      get: op('Orders', 'Live order queue (vendor/admin)', { security: auth, parameters: [{ name: 'scope', in: 'query', schema: { type: 'string', enum: ['active', 'today'] } }], responses: staffOnly }),
    },
    '/api/orders/mine': { get: op('Orders', 'My order history (FR-12)', { security: auth, responses: std }) },
    '/api/orders/{orderNumber}': { get: op('Orders', 'Track one order', { security: auth, parameters: [idParam('orderNumber')], responses: { ...std, 404: err('Not found') } }) },
    '/api/orders/{orderNumber}/status': { patch: op('Orders', 'Move an order through its lifecycle (staff) or cancel it (owner, while PLACED)', { security: auth, parameters: [idParam('orderNumber')], requestBody: body(s.orderStatus, { status: 'ACCEPTED' }), responses: { ...staffOnly, 409: err('Invalid status change') } }) },
    '/api/orders/{orderNumber}/review': { post: op('Orders', 'Review a collected order once (FR-13)', { security: auth, parameters: [idParam('orderNumber')], requestBody: body(s.review, { rating: 5, comment: 'Ready before my lecture ended' }), responses: { 201: ok('Created'), ...std, 409: err('Not collected yet or already reviewed') } }) },

    '/api/wallet': { get: op('Wallet & credit', 'Wallet, credit account and recent activity (students)', { security: auth, responses: staffOnly }) },
    '/api/wallet/top-up': { post: op('Wallet & credit', 'Top up the wallet (R10–R2000, card simulated)', { security: auth, requestBody: body(s.topUp, { amount: 100 }), responses: staffOnly }) },
    '/api/wallet/repay': { post: op('Wallet & credit', 'Repay student credit from wallet or card', { security: auth, requestBody: body(s.repay, { amount: 50, source: 'CARD' }), responses: { ...staffOnly, 409: err('Nothing owed') } }) },

    '/api/notifications': { get: op('Notifications', 'Latest notifications and unread count (FR-14, FR-27)', { security: auth, responses: std }) },
    '/api/notifications/read-all': { patch: op('Notifications', 'Mark all as read', { security: auth, responses: std }) },
    '/api/notifications/{id}/read': { patch: op('Notifications', 'Mark one as read', { security: auth, parameters: [idParam('id')], responses: { ...std, 404: err('Not found') } }) },

    '/api/admin/dashboard': { get: op('Admin', "Today's figures (staff)", { security: auth, responses: staffOnly }) },
    '/api/admin/reports': { get: op('Admin', 'Sales by day, top sellers, payment mix, ratings (FR-25)', { security: auth, parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 7 } }], responses: staffOnly }) },
    '/api/admin/reports/export.csv': { get: { tags: ['Admin'], summary: 'Sales report as CSV (FR-26)', security: auth, parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 7 } }], responses: { 200: { description: 'CSV file', content: { 'text/csv': {} } }, ...staffOnly } } },
    '/api/admin/students': { get: op('Admin', 'Students with credit and wallet balances (FR-17)', { security: auth, responses: staffOnly }) },
    '/api/admin/students/export.csv': { get: { tags: ['Admin'], summary: 'Customer data as CSV (FR-28)', security: auth, responses: { 200: { description: 'CSV file', content: { 'text/csv': {} } }, ...staffOnly } } },
    '/api/admin/students/{id}/verify': { patch: op('Admin', 'Verify a student for credit (FR-19)', { security: auth, parameters: [idParam('id')], requestBody: body(s.verify, { verified: true }), responses: staffOnly }) },
    '/api/admin/students/{id}/credit-limit': { patch: op('Admin', "Set a student's credit limit (FR-24)", { security: auth, parameters: [idParam('id')], requestBody: body(s.creditLimit, { creditLimit: 250 }), responses: staffOnly }) },
    '/api/admin/students/{id}/credit-status': { patch: op('Admin', "Suspend or re-activate a student's credit", { security: auth, parameters: [idParam('id')], requestBody: body(s.creditStatus, { status: 'SUSPENDED' }), responses: staffOnly }) },
    '/api/admin/settings': {
      get: op('Admin', 'Business settings', { security: auth, responses: staffOnly }),
      patch: op('Admin', 'Update service fee, default credit limit and loyalty rules (FR-23)', { security: auth, requestBody: body(s.settings, { serviceFee: 2, pointValue: 0.5 }), responses: staffOnly }),
    },

    '/api/truck': {
      get: op('Truck & public', 'Open/closed, location, hours (FR-01, FR-09, FR-10)'),
      patch: op('Truck & public', 'Update status or location (vendor/admin)', { security: auth, requestBody: body(s.truck, { isOpen: true, locationName: 'Main gate' }), responses: staffOnly }),
    },
    '/api/settings/public': { get: op('Truck & public', 'Service fee and loyalty rules shown at checkout') },
    '/api/reviews': { get: op('Truck & public', 'Latest reviews and average rating', { parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 6 } }] }) },
  },
};
