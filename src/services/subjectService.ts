import { SubjectRepository } from '../repositories/subjectRepository';
import { z } from 'zod';
import { createSubjectSchema, updateSubjectSchema } from '../schemas/basicSchemas';

const repository = new SubjectRepository();

export class SubjectService {
  async getAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const total = await repository.count();
    const data = await repository.findAll(skip, limit);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const subject = await repository.findById(id);
    if (!subject) throw { status: 404, message: 'Disciplina não encontrada', code: 'SUBJECT_NOT_FOUND' };
    return subject;
  }

  async create(data: z.infer<typeof createSubjectSchema>) {
    return repository.create(data);
  }

  async update(id: string, data: z.infer<typeof updateSubjectSchema>) {
    await this.getById(id);
    return repository.update(id, data);
  }

  async delete(id: string) {
    const existing = await this.getById(id);
    const hasClasses = Boolean(existing.classes && existing.classes.length > 0);
    const hasContents = Boolean(existing.contents && existing.contents.length > 0);

    if (hasClasses || hasContents) {
      throw {
        status: 409,
        message: 'Não é possível excluir uma disciplina que possui turmas ou conteúdos programáticos vinculados.',
        code: 'SUBJECT_HAS_DEPENDENCIES'
      };
    }

    return repository.delete(id);
  }
}
