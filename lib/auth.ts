import { api, setAuthToken } from './api';
import { encryptPassword } from './crypto';

const TOKEN_KEY = 'restaurant_onboarding_token';

export { setAuthToken };

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function parseJwtPayload(token: string) {
  if (typeof window === 'undefined') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = atob(padded);
    const payload = decodeURIComponent(
      decoded
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join(''),
    );
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function getUserRole() {
  const token = getToken();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  return payload?.role ?? null;
}

export function getUserEmail() {
  const token = getToken();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  return payload?.email ?? payload?.sub ?? null;
}

export function getUserDisplayName() {
  const token = getToken();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  return payload?.displayName ?? payload?.name ?? null;
}

export function getUserRestaurantId() {
  const token = getToken();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  return payload?.restaurantId ?? null;
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  setAuthToken(token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  setAuthToken(null);
}

export async function login(email: string, password: string) {
  const response = await api.post('/auth/login', { email, password: encryptPassword(password) });
  const token = response.data.accessToken;
  setToken(token);
  return response.data;
}
