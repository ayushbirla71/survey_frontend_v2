import { isEqual } from "lodash";

export function deepEqual(a: any, b: any) {
  return isEqual(a, b);
}
