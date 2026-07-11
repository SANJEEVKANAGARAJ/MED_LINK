const express = require('express');
const request = require('supertest');

const app = express();
app.use(express.json());

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'dr_sharma' && password === 'password123') {
    return res.status(200).json({ token: 'mock_jwt_token', role: 'doctor' });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

describe('Auth Flow Integration', () => {
  it('should successfully log in Dr. Sharma', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'dr_sharma',
        password: 'password123'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token', 'mock_jwt_token');
    expect(res.body).toHaveProperty('role', 'doctor');
  });

  it('should fail login for Patient Rahul with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'rahul',
        password: 'wrongpassword'
      });
    
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Invalid credentials');
  });
});
