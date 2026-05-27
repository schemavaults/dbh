function isValidPort(val: number): val is number {
  return (
    !isNaN(val) && Number.isInteger(val) && Number.isFinite(val) && val > 0
  );
}

export default function parsePort(val: string | number): number {
  if (typeof val === "number") {
    if (isValidPort(val)) {
      return val;
    }
  } else if (typeof val === "string") {
    const parsed = Number.parseInt(val);
    if (isValidPort(parsed)) {
      return parsed;
    }
  } else {
    throw new TypeError(
      `Unexpected type for value to parse port number from: '${typeof val}'`,
    );
  }
  throw new TypeError(
    "Failed to parse port number for database configuration!",
  );
}
