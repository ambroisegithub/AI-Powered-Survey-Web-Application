import request from 'supertest';
import { expect } from 'chai';
import app from '../../index';

describe('API Endpoints', () => {
  it('should create a new survey', async () => {
    const res = await request(app)
      .post('/surveys')
      .send({ title: 'Test Survey', description: 'Test Description', creator_id: 'some-uuid' });
    expect(res.status).to.equal(200);
    expect(res.body).to.not.be.empty;
  });
});