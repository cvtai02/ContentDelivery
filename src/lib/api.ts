let accessToken: string | null = null;

async function login() {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemSecret: '123456' }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = (await res.json()) as { accessToken: string };
  accessToken = data.accessToken;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!accessToken) await login();

  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    await login();
    return fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...init?.headers,
      },
    });
  }

  return res;
}
