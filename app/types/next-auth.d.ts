import { SubscriptionType } from "@prisma/client";
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      subscriptionType?: SubscriptionType;
      lifetimeAccess?: boolean;
      subscriptionEndDate?: Date | null;
      totalGenerations?: number;
    };
  }

  interface User {
    id: string;
    subscriptionType?: SubscriptionType;
    lifetimeAccess?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string;
  }
}
