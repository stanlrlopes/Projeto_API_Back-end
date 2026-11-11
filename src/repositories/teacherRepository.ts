import { PrismaClient, Teacher, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class TeacherRepository {
  async findAll(skip: number, take: number): Promise<Teacher[]> {
    return prisma.teacher.findMany({ skip, take });
  }

  async count(): Promise<number> {
    return prisma.teacher.count();
  }

  async findById(id: string) {
    return prisma.teacher.findUnique({
      where: { id },
      include: {
        classes: true
      }
    });
  }

  async findByUserId(userId: string): Promise<Teacher | null> {
    return prisma.teacher.findUnique({ where: { userId } });
  }

  async findByRegistrationOrEmail(registration: string, email: string): Promise<Teacher | null> {
    return prisma.teacher.findFirst({
      where: { OR: [{ registration }, { email }] }
    });
  }

  async create(data: Prisma.TeacherUncheckedCreateInput): Promise<Teacher> {
    return prisma.teacher.create({ data });
  }

  async createWithUser(
    userData: Prisma.UserCreateInput,
    teacherData: Omit<Prisma.TeacherUncheckedCreateInput, 'userId'>
  ): Promise<Teacher> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: userData });
      return tx.teacher.create({
        data: {
          ...teacherData,
          userId: user.id
        }
      });
    });
  }

  async update(id: string, data: Prisma.TeacherUpdateInput): Promise<Teacher> {
    return prisma.teacher.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Teacher> {
    return prisma.$transaction(async (tx) => {
      const deletedTeacher = await tx.teacher.delete({ where: { id } });

      if (deletedTeacher.userId) {
        const linkedUser = await tx.user.findUnique({
          where: { id: deletedTeacher.userId },
          include: { student: true, teacher: true }
        });

        const hasOtherLegitimateLinks = Boolean(
          linkedUser &&
            ((linkedUser.teacher && linkedUser.teacher.id !== id) ||
              linkedUser.student ||
              linkedUser.role === 'ADMIN')
        );

        if (linkedUser && !hasOtherLegitimateLinks) {
          await tx.user.delete({ where: { id: linkedUser.id } });
        }
      }

      return deletedTeacher;
    });
  }
}
