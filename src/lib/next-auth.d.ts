import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      role?: string | null
      branchId?: number | null
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    role?: string | null
    branchId?: number | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    branchId?: number
  }
}