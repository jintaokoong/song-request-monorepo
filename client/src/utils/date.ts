import dayjs from "dayjs";

const getLocalDate = (date: string | Date) => {
  const day = dayjs(date);
  return day.format("YYYY-MM-DD");
};

const isoStringToMilliseconds = (date: string) => {
  const day = dayjs(date);
  return day.valueOf();
};

export default { getLocalDate, isoStringToMilliseconds };
