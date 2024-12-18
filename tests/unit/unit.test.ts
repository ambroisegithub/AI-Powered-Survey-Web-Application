import { expect } from 'chai';
import supabase from '../../src/config/supabase';

describe('Supabase Functions', () => {
  it('should create a new survey', async () => {
    const { data, error } = await supabase.from('surveys').insert([{ title: 'Test Survey', description: 'Test Description', creator_id: 'some-uuid' }]);
    expect(error).to.be.null;
    expect(data).to.not.be.empty;
  });
});