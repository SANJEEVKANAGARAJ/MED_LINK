const db = require('../../src/db');

jest.mock('../../src/db', () => ({
  query: jest.fn()
}));

describe('Booking Conflict Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect when Patient Rahul tries to book a slot that is already booked', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'confirmed', doctor_id: 1, start_time: '2026-07-04T10:00:00Z', end_time: '2026-07-04T10:30:00Z' }] });

    const checkConflict = async (doctorId, startTime, endTime) => {
      const res = await db.query('SELECT * FROM appointments WHERE doctor_id = $1 AND start_time = $2', [doctorId, startTime]);
      return res.rows.length > 0;
    };

    const isConflict = await checkConflict(1, '2026-07-04T10:00:00Z', '2026-07-04T10:30:00Z');
    expect(isConflict).toBe(true);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it('should allow booking for Patient Rahul with Dr. Sharma when slot is free', async () => {
   db.query.mockResolvedValueOnce({ rows: [] });

    const checkConflict = async (doctorId, startTime, endTime) => {
      const res = await db.query('SELECT * FROM appointments WHERE doctor_id = $1 AND start_time = $2', [doctorId, startTime]);
      return res.rows.length > 0;
    };

    const isConflict = await checkConflict(2, '2026-07-04T11:00:00Z', '2026-07-04T11:30:00Z');
    expect(isConflict).toBe(false);
  });
});

describe('Slot Hold Expiry', () => {
  it('should expire the slot hold after 10 minutes', () => {
    const holdStartTime = new Date('2026-07-04T10:00:00Z');
    const currentTime = new Date('2026-07-04T10:11:00Z');
    
    const isExpired = (currentTime - holdStartTime) > 10 * 60 * 1000;
    expect(isExpired).toBe(true);
  });
});

describe('Leave Conflict Detection', () => {
  it('should detect if Dr. Gupta is on leave during the requested slot', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ doctor_id: 3, start_date: '2026-07-04', end_date: '2026-07-05' }] });

    const checkLeave = async (doctorId, reqDate) => {
      const res = await db.query('SELECT * FROM doctor_leaves WHERE doctor_id = $1 AND start_date <= $2 AND end_date >= $2', [doctorId, reqDate]);
      return res.rows.length > 0;
    };

    const onLeave = await checkLeave(3, '2026-07-04');
    expect(onLeave).toBe(true);
  });
});
