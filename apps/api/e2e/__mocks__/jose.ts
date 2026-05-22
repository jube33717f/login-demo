export function createRemoteJWKSet() {
  return jest.fn();
}

export async function jwtVerify() {
  return {
    payload: {
      sub: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
  };
}
