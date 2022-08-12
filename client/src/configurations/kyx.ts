import ky from 'ky';

const kyx = ky.create({
  prefixUrl: 'http://localhost:4000/api',
  hooks: {
    beforeRequest: [
      (request) => {
        const key = localStorage.getItem('api-key');
        key && request.headers.set('x-api-key', key);
      },
    ],
  },
});

export default kyx;
