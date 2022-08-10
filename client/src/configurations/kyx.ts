import ky from 'ky'

const kyx = ky.create({ prefixUrl: 'http://localhost:4000/api' });

export default kyx;
