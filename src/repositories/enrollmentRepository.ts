import { PrismaClient, Enrollment, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

export class EnrollmentRepository {
  async findAll(skip: number, take: number, where?: Prisma.EnrollmentWhereInput) {
    return prisma.enrollment.findMany({
      where,
      skip,
      take,
      include: { student: true, class: { include: { teacher: true, subject: true } } }
    });
  }
  async count(where?: Prisma.EnrollmentWhereInput) {
    return prisma.enrollment.count({ where });
  }
  async findById(id: string) {
    return prisma.enrollment.findUnique({
      where: { id },
      include: { student: true, class: { include: { teacher: true, subject: true } } }
    });
  }
  async findByStudentAndClass(studentId: string, classId: string) {
    return prisma.enrollment.findUnique({ where: { studentId_classId: { studentId, classId } } });
  }
  async create(data: Prisma.EnrollmentUncheckedCreateInput) { return prisma.enrollment.create({ data }); }
  async update(id: string, data: Prisma.EnrollmentUncheckedUpdateInput) { return prisma.enrollment.update({ where: { id }, data }); }
  async delete(id: string) { return prisma.enrollment.delete({ where: { id } }); }
}
