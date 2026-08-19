/** Shared auth types — aman diimpor dari Edge (proxy) dan Node. */

export const AUTH_COOKIE = "pinjamin_session";

/** Sesi panjang (Remember me) — 7 hari. */
export const SESSION_MAX_AGE_LONG = 60 * 60 * 24 * 7;
/** Sesi pendek — 12 jam. */
export const SESSION_MAX_AGE_SHORT = 60 * 60 * 12;

export interface SessionPayload {
  sub: string;
  username: string;
  tv: number;
  iat: number;
  exp: number;
}

export interface PublicAdmin {
  id: string;
  username: string;
  fullName: string;
  avatar: string;
}

export interface AdminProfile extends PublicAdmin {
  hash: string;
  tokenVersion: number;
}
