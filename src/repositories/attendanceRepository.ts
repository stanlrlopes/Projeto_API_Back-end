import { PrismaClient, Attendance, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

export class AttendanceRepository {
  async findAll(skip: number, take: number, where?: Prisma.AttendanceWhereInput) {
    return prisma.attendance.findMany({
      where,
      skip,
      take,
      include: { student: true, class: { include: { teacher: true } } }
    });
  }
  async count(where?: Prisma.AttendanceWhereInput) {
    return prisma.attendance.count({ where });
  }
  async findById(id: string) {
    return prisma.attendance.findUnique({
      where: { id },
      include: { student: true, class: { include: { teacher: true } } }
    });
  }
  async findByUniqueParams(studentId: string, classId: string, date: Date) {
    return prisma.attendance.findUnique({ where: { studentId_classId_date: { studentId, classId, date } } });
  }
  async create(data: Prisma.AttendanceUncheckedCreateInput) { return prisma.attendance.create({ data }); }
  async update(id: string, data: Prisma.AttendanceUncheckedUpdateInput) { return prisma.attendance.update({ where: { id }, data }); }
  async delete(id: string) { return prisma.attendance.delete({ where: { id } }); }
}
