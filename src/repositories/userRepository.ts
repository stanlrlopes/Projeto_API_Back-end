import { PrismaClient, User, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export type UserWithProfiles = Prisma.UserGetPayload<{
  include: { student: true; teacher: true };
}>;

export class UserRepository {
  async findByEmail(email: string): Promise<UserWithProfiles | null> {
    return prisma.user.findUnique({
      where: { email },
      include: { student: true, teacher: true },
    });
  }

  async findById(id: string): Promise<UserWithProfiles | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { student: true, teacher: true },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }
}
