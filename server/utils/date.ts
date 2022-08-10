// get a random date within a range
export const getRandomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const date = {
  getRandomDate,
};

export default date;
