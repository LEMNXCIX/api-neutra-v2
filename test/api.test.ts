jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import api from './test-client';

test('La raíz de la api ha respondido', async () => {
  await api.get('/').expect(200).expect('Content-Type', /application\/json/);
});

