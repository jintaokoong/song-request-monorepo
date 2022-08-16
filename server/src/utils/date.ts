// get a random date within a range
export const getRandomDate = (start: Date, end: Date) => {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
};

// get the start of the day in taipei time in utc given a date in utc
export const getDateInTaipei = (date: Date): Date => {
  const offset = 8 * 60 * 60 * 1000; // 8 hours
  const taipeiTime = new Date(date.getTime() + offset);
  const taipeiDate = new Date(
    taipeiTime.getFullYear(),
    taipeiTime.getMonth(),
    taipeiTime.getDate()
  );
  return new Date(taipeiDate.getTime() - offset);
};

const date = {
  getRandomDate,
  getDateInTaipei,
};

export default date;
