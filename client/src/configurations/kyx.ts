import ky from 'ky';

const kyx = ky.create({
  prefixUrl: import.meta.env.VITE_API_BASE,
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
