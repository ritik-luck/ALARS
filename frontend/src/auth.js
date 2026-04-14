const TOKEN_KEY = 'alars_token';
const USER_KEY = 'alars_user';

function decodeTokenUser(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      username: payload.username,
      role: String(payload.role || '').toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);

  const sessionUser = user || decodeTokenUser(token);
  if (sessionUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
  }
}

export function setToken(token) {
  setSession(token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const storedUser = localStorage.getItem(USER_KEY);

  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      return { ...parsed, role: String(parsed.role || '').toLowerCase() };
    } catch {
      localStorage.removeItem(USER_KEY);
    }
  }

  const tokenUser = decodeTokenUser(getToken());
  if (tokenUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(tokenUser));
  }

  return tokenUser;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
