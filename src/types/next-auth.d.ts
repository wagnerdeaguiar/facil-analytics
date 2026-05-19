import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      subscriptionStatus?: string;
      isBlocked?: boolean;
    };
  }

  interface User {
    role: string;
    subscriptionStatus: string;
    isBlocked: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    subscriptionStatus?: string;
    isBlocked?: boolean;
  }
}
