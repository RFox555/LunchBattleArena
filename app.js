import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Simple in-memory storage
const users = {
  'admin': { id: 1, username: 'admin', password: 'admin123', type: 'admin', name: 'Administrator' },
  '21054': { id: 2, username: '21054', password: 'driver123', type: 'driver', name: 'Ronny Ferreira' },
  '21055': { id: 3, username: '21055', password: 'employee123', type: 'employee', name: 'Johan', employeeId: '21055' }
};

let trips = [];
let driverStatus = {};

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password, userType } = req.body;
  
  const user = users[username];
  if (!user || user.password !== password || user.type !== userType) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({ success: true, user: { id: user.id, username: user.username, type: user.type, name: user.name, employeeId: user.employeeId } });
});

// Driver check-in
app.post('/api/driver/checkin', (req, res) => {
  const { driverId, location, note } = req.body;
  driverStatus[driverId] = { checkedIn: true, location, note, time: new Date() };
  res.json({ success: true });
});

// Driver check-out
app.post('/api/driver/checkout', (req, res) => {
  const { driverId, note } = req.body;
  driverStatus[driverId] = { checkedIn: false, note, time: new Date() };
  res.json({ success: true });
});

// Get driver status
app.get('/api/driver/:id/status', (req, res) => {
  const status = driverStatus[req.params.id] || { checkedIn: false };
  res.json(status);
});

// Employee check-in via QR scan
app.post('/api/employee/checkin', (req, res) => {
  const { employeeId, location, driverId } = req.body;
  
  trips.push({
    id: Date.now(),
    employeeId,
    location,
    driverId,
    time: new Date(),
    type: 'checkin'
  });
  
  res.json({ success: true, message: `Employee ${employeeId} checked in successfully` });
});

// Get trips for employee
app.get('/api/trips/:employeeId', (req, res) => {
  const employeeTrips = trips.filter(trip => trip.employeeId === req.params.employeeId);
  res.json(employeeTrips);
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Transportation Tracking System running on port ${PORT}`);
});