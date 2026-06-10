// NextAuth configuration — replaces Supabase Auth. Credentials provider that
// verifies the password against auth.users.encrypted_password (the bcrypt hash
// migrated from Supabase). JWT session strategy; the user id rides on the token.
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.users.findFirst({
          where: { email: credentials.email.toLowerCase().trim() },
          select: { id: true, email: true, encrypted_password: true },
        });
        if (!user?.encrypted_password) return null;
        const ok = await bcrypt.compare(credentials.password, user.encrypted_password);
        if (!ok) return null;
        return { id: user.id, email: user.email ?? "" };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (user) token.id = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (session.user) (session.user as any).id = token.id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
