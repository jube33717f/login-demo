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

function decodeBase64UrlJson(segment: string) {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

export function decodeProtectedHeader(token: string) {
  const [header] = token.split('.');
  return decodeBase64UrlJson(header);
}

export function decodeJwt(token: string) {
  const [, payload] = token.split('.');
  return decodeBase64UrlJson(payload);
}
