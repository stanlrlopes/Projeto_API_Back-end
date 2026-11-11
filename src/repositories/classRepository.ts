import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();

export class ClassRepository {
  async findAll(skip: number, take: number, where?: Prisma.ClassWhereInput) {
    return prisma.class.findMany({ where, skip, take, include: { teacher: true, subject: true } });
  }
  async count(where?: Prisma.ClassWhereInput) {
    return prisma.class.count({ where });
  }
  async findById(id: string) {
    return prisma.class.findUnique({
      where: { id },
      include: {
        teacher: true,
        subject: true,
        enrollments: { include: { student: true } },
        activities: true,
        attendances: true
      }
    });
  }
  async create(data: Prisma.ClassUncheckedCreateInput) { return prisma.class.create({ data }); }
  async update(id: string, data: Prisma.ClassUncheckedUpdateInput) { return prisma.class.update({ where: { id }, data }); }
  async delete(id: string) { return prisma.class.delete({ where: { id } }); }
}
