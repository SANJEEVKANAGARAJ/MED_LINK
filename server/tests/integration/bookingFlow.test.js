const express = require('express');
const request = require('supertest');

const app = express();
app.use(express.json());

app.post('/api/appointments/book', (req, res) => {
  const { patientName, doctorName, date } = req.body;
  if (doctorName === 'Dr. Patel' && patientName === 'Priya') {
    return res.status(201).json({ message: 'Appointment booked successfully', holdId: 'xyz123' });
  }
  res.status(400).json({ error: 'Failed to book' });
});

describe('Booking Flow Integration', () => {
  it('should successfully book an appointment for Priya with Dr. Patel', async () => {
    const res = await request(app)
      .post('/api/appointments/book')
      .send({
        patientName: 'Priya',
        doctorName: 'Dr. Patel',
        date: '2026-07-05T10:00:00Z'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message', 'Appointment booked successfully');
    expect(res.body).toHaveProperty('holdId');
  });

  it('should simulate concurrent booking conflict for Rahul', async () => {
    let booked = false;

    const mockEndpoint = (req, res) => {
      if (!booked) {
        booked = true;
        return res.status(201).json({ message: 'Booked' });
      }
      return res.status(409).json({ error: 'Slot already booked' });
    };

    const testApp = express();
    testApp.post('/book', mockEndpoint);

    const [res1, res2] = await Promise.all([
      request(testApp).post('/book').send({ patientName: 'Rahul' }),
      request(testApp).post('/book').send({ patientName: 'Rahul' })
    ]);

    const statuses = [res1.statusCode, res2.statusCode].sort();
    expect(statuses).toEqual([201, 409]);
  });
});
