import { customerApi, setCustomerAuthToken, CUSTOMER_TOKEN_KEY } from './api';

const CUSTOMER_REFRESH_TOKEN_KEY = 'customer_refresh_token';

export { setCustomerAuthToken };

export function getCustomerToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function getCustomerRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CUSTOMER_REFRESH_TOKEN_KEY);
}

function parseJwtPayload(token: string) {
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

export function getCustomerId() {
  const token = getCustomerToken();
  if (!token) return null;
  return parseJwtPayload(token)?.sub ?? null;
}

export function getCustomerPhone() {
  const token = getCustomerToken();
  if (!token) return null;
  return parseJwtPayload(token)?.phone ?? null;
}

export function getCustomerName() {
  const token = getCustomerToken();
  if (!token) return null;
  const p = parseJwtPayload(token);
  return p?.name ?? p?.displayName ?? null;
}

export function isCustomerTokenValid() {
  const token = getCustomerToken();
  if (!token) return false;
  const payload = parseJwtPayload(token);
  if (!payload) return false;
  if (typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
  }
  return true;
}

export function setCustomerTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOMER_TOKEN_KEY, accessToken);
  setCustomerAuthToken(accessToken);
  if (refreshToken) {
    localStorage.setItem(CUSTOMER_REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearCustomerTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_REFRESH_TOKEN_KEY);
  setCustomerAuthToken(null);
}