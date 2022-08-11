// replace
const replaceAt = <T>(array: T[], index: number, value: T): T[] => [
  ...array.slice(0, index),
  value,
  ...array.slice(index + 1),
];

// remove at index immutably
const removeAt = <T>(array: T[], index: number): T[] => [
  ...array.slice(0, index),
  ...array.slice(index + 1),
];

export default { replaceAt, removeAt };
