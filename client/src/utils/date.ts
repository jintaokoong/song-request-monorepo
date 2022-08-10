import dayjs from 'dayjs';

const getLocalDate = (date: string) => {
  const day = dayjs(date);
  return day.format('YYYY-MM-DD');
}

export default { getLocalDate }
