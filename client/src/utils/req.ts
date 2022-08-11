import { Request } from "../App";
import date from "./date";

const compareFn = (a: number, b: number) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const requestCompareFn = (a: Request, b: Request) => {
  return (
    compareFn(
      date.isoStringToMilliseconds(b.key),
      date.isoStringToMilliseconds(a.key)
    ) ||
    compareFn(
      date.isoStringToMilliseconds(a.createdAt),
      date.isoStringToMilliseconds(b.createdAt)
    )
  );
};

export default { requestCompareFn };
