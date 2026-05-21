import type { SessionUser } from './api';

let currentUser: SessionUser | null = null;

export function setSession(user: SessionUser | null) {
  currentUser = user;
}

export function getSession(): SessionUser | null {
  return currentUser;
}
