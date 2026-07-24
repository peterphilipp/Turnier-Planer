const jwt = require('jsonwebtoken');

// Simuliere was der Login zurückgibt
const userFromDB = {
  id: 1,
  name: 'Peter Philipp',
  email: 'peter.philipp@web.de',
  role: 'ADMIN',
  tournamentId: 1
};

const JWT_SECRET = process.env.JWT_SECRET || 'tsv-holm-secret-2025';
const token = jwt.sign({ userId: userFromDB.id, role: userFromDB.role }, JWT_SECRET, { expiresIn: '30d' });

console.log('=== Login Response Simulation ===');
console.log('Token:', token);
console.log('\nDecoded Token Payload:');
const decoded = jwt.verify(token, JWT_SECRET);
console.log(JSON.stringify(decoded, null, 2));
console.log('\nUser Role in DB:', userFromDB.role);
console.log('Role im JWT:', decoded.role);
