const POINTS_KEY = "bird-points";

export function getPoints(): number {
  return parseInt(localStorage.getItem(POINTS_KEY) || "0", 10);
}

export function addPoints(amount: number): number {
  const current = getPoints() + amount;
  localStorage.setItem(POINTS_KEY, current.toString());
  return current;
}
