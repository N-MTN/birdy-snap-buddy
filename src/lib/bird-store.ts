export interface BirdSighting {
  id: string;
  photo: string; // base64 data URL
  name: string;
  notes: string;
  date: string;
  location?: string;
}

const STORAGE_KEY = "bird-sightings";

export function getSightings(): BirdSighting[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addSighting(sighting: BirdSighting) {
  const all = getSightings();
  all.unshift(sighting);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deleteSighting(id: string) {
  const all = getSightings().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
