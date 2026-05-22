export type UserInfo = {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
};

export type ProtectedData = {
  items: Array<{
    id: string;
    title: string;
    status: 'completed' | 'pending';
  }>;
};
