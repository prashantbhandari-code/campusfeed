import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('Invalid credentials');
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isCorrectPassword) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          department: user.department,
          batchYear: user.batchYear,
          rollNumber: user.rollNumber,
          collegeEmail: user.collegeEmail,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        const email = user.email || '';
        
        // Only allow @kiit.ac.in emails
        if (!email.endsWith('@kiit.ac.in')) {
          return false;
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          // Auto-create account from Google profile
          const name = user.name || 'Student';
          const username = email.split('@')[0].replace(/[^a-z0-9_]/g, '');
          
          // Check if username is taken
          const existingUsername = await prisma.user.findUnique({
            where: { username },
          });
          
          const finalUsername = existingUsername ? `${username}_${Date.now().toString(36)}` : username;
          
          const newUser = await prisma.user.create({
            data: {
              name,
              username: finalUsername,
              email,
              password: '', // No password for OAuth users
              avatar: user.image,
              collegeEmail: email,
            },
          });
          
          // Update the user object with the new user's ID
          user.id = newUser.id;
          (user as any).username = newUser.username;
          (user as any).collegeEmail = newUser.collegeEmail;
        } else {
          // Update existing user's avatar if it changed
          if (user.image && existingUser.avatar !== user.image) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { avatar: user.image },
            });
          }
          user.id = existingUser.id;
          (user as any).username = existingUser.username;
          (user as any).department = existingUser.department;
          (user as any).batchYear = existingUser.batchYear;
          (user as any).rollNumber = existingUser.rollNumber;
          (user as any).collegeEmail = existingUser.collegeEmail;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.avatar = (user as any).avatar;
        token.department = (user as any).department;
        token.batchYear = (user as any).batchYear;
        token.rollNumber = (user as any).rollNumber;
        token.collegeEmail = (user as any).collegeEmail;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).avatar = token.avatar;
        (session.user as any).department = token.department;
        (session.user as any).batchYear = token.batchYear;
        (session.user as any).rollNumber = token.rollNumber;
        (session.user as any).collegeEmail = token.collegeEmail;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
