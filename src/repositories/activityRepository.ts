import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class ActivityRepository {
  async findAll(skip: number, take: number, where?: Prisma.ActivityWhereInput) {
    return prisma.activity.findMany({
      where,
      skip,
      take,
      include: {
        content: true,
        class: { include: { teacher: true, enrollments: { include: { student: true } } } }
      }
    });
  }
  async count(where?: Prisma.ActivityWhereInput) {
    return prisma.activity.count({ where });
  }
  async findById(id: string) {
    return prisma.activity.findUnique({
      where: { id },
      include: {
        content: true,
        class: { include: { teacher: true, enrollments: { include: { student: true } } } },
        grades: true
      }
    });
  }
  async create(data: Prisma.ActivityUncheckedCreateInput) { return prisma.activity.create({ data }); }
  async update(id: string, data: Prisma.ActivityUncheckedUpdateInput) { return prisma.activity.update({ where: { id }, data }); }
  async delete(id: string) { return prisma.activity.delete({ where: { id } }); }
}
