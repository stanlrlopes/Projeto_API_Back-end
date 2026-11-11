import { PrismaClient, Student, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class StudentRepository {
  async findAll(skip: number, take: number, where?: Prisma.StudentWhereInput): Promise<Student[]> {
    return prisma.student.findMany({ where, skip, take });
  }

  async count(where?: Prisma.StudentWhereInput): Promise<number> {
    return prisma.student.count({ where });
  }

  async findById(id: string) {
    return prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: true,
        grades: true,
        attendances: true
      }
    });
  }

  async findByUserId(userId: string): Promise<Student | null> {
    return prisma.student.findUnique({ where: { userId } });
  }

  async findByRegistrationOrEmail(registration: string, email: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: { OR: [{ registration }, { email }] }
    });
  }

  async create(data: Prisma.StudentUncheckedCreateInput): Promise<Student> {
    return prisma.student.create({ data });
  }

  async createWithUser(
    userData: Prisma.UserCreateInput,
    studentData: Omit<Prisma.StudentUncheckedCreateInput, 'userId'>
  ): Promise<Student> {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: userData });
      return tx.student.create({
        data: {
          ...studentData,
          userId: user.id
        }
      });
    });
  }

  async update(id: string, data: Prisma.StudentUpdateInput): Promise<Student> {
    return prisma.student.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Student> {
    return prisma.$transaction(async (tx) => {
      const deletedStudent = await tx.student.delete({ where: { id } });

      if (deletedStudent.userId) {
        const linkedUser = await tx.user.findUnique({
          where: { id: deletedStudent.userId },
          include: { student: true, teacher: true }
        });

        const hasOtherLegitimateLinks = Boolean(
          linkedUser &&
            ((linkedUser.student && linkedUser.student.id !== id) ||
              linkedUser.teacher ||
              linkedUser.role === 'ADMIN')
        );

        if (linkedUser && !hasOtherLegitimateLinks) {
          await tx.user.delete({ where: { id: linkedUser.id } });
        }
      }

      return deletedStudent;
    });
  }
}
