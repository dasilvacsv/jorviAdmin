import NextAuth, { type User } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { compare } from "bcryptjs"
import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.select().from(users).where(eq(users.email, credentials.email.toString())).limit(1)

        if (user.length === 0) return null

        const dbUser = user[0]

        // Check if passwordHash exists
        if (!dbUser.passwordHash) {
          console.error("User found but passwordHash is missing")
          return null
        }

        const isPasswordValid = await compare(credentials.password.toString(), dbUser.passwordHash)

        if (!isPasswordValid) return null

        return {
          id: dbUser.id.toString(),
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          branchId: dbUser.branchId,
        } as User
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await db.select().from(users).where(eq(users.email, user.email!)).limit(1)
          
          if (existingUser.length === 0) {
            // Create new user with Google OAuth
            await db.insert(users).values({
              name: user.name!,
              email: user.email!,
              passwordHash: "", // Empty for OAuth users
              role: "employee", // Default role
              branchId: null, // Will need to be assigned later
            })
          }
          return true
        } catch (error) {
          console.error("Error creating Google user:", error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.role = user.role
        token.branchId = user.branchId
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.role = token.role as string
        session.user.branchId = token.branchId as number
      }

      return session
    },
  },
})