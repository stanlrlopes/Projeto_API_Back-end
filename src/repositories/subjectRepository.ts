import { PrismaClient, Subject, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export class SubjectRepository {
  async findAll(skip: number, take: number): Promise<Subject[]> {
    return prisma.subject.findMany({ skip, take });
  }

  async count(): Promise<number> {
    return prisma.subject.count();
  }

  async findById(id: string) {
    return prisma.subject.findUnique({
      where: { id },
      include: {
        classes: true,
        contents: true
      }
    });
  }

  async create(data: Prisma.SubjectCreateInput): Promise<Subject> {
    return prisma.subject.create({ data });
  }

  async update(id: string, data: Prisma.SubjectUpdateInput): Promise<Subject> {
    return prisma.subject.update({ where: { id }, data });
  }

  async delete(id: string): Promise<Subject> {
    return prisma.subject.delete({ where: { id } });
  }
}
