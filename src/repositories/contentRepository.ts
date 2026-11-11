import { PrismaClient, Content, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class ContentRepository {
  async findAll(skip: number, take: number, where?: Prisma.ContentWhereInput) {
    return prisma.content.findMany({ where, skip, take, include: { subject: true } });
  }
  async count(where?: Prisma.ContentWhereInput) {
    return prisma.content.count({ where });
  }
  async findById(id: string) {
    return prisma.content.findUnique({
      where: { id },
      include: {
        subject: {
          include: {
            classes: {
              include: {
                teacher: true,
                enrollments: { include: { student: true } }
              }
            }
          }
        },
        activities: {
          include: {
            class: true
          }
        }
      }
    });
  }
  async create(data: Prisma.ContentUncheckedCreateInput): Promise<Content> {
    return prisma.content.create({ data });
  }
  async update(id: string, data: Prisma.ContentUncheckedUpdateInput): Promise<Content> {
    return prisma.content.update({ where: { id }, data });
  }
  async delete(id: string): Promise<Content> {
    return prisma.content.delete({ where: { id } });
  }
}
