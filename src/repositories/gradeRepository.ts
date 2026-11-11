import { PrismaClient, Grade, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

export class GradeRepository {
  async findAll(skip: number, take: number, where?: Prisma.GradeWhereInput) {
    return prisma.grade.findMany({
      where,
      skip,
      take,
      include: { student: true, activity: { include: { class: { include: { teacher: true } } } } }
    });
  }
  async count(where?: Prisma.GradeWhereInput) {
    return prisma.grade.count({ where });
  }
  async findById(id: string) {
    return prisma.grade.findUnique({
      where: { id },
      include: { student: true, activity: { include: { class: { include: { teacher: true } } } } }
    });
  }
  async findByStudentAndActivity(studentId: string, activityId: string) {
    return prisma.grade.findUnique({ where: { studentId_activityId: { studentId, activityId } } });
  }
  async create(data: Prisma.GradeUncheckedCreateInput) { return prisma.grade.create({ data }); }
  async update(id: string, data: Prisma.GradeUncheckedUpdateInput) { return prisma.grade.update({ where: { id }, data }); }
  async delete(id: string) { return prisma.grade.delete({ where: { id } }); }
}
