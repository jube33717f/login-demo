import type { Request } from 'express';

import type { AuthSession, ValidatedUser } from '../../auth/types';

export type RequestWithAuth = Request & {
  user: ValidatedUser;
  authSession: AuthSession;
};
