import { ContentRepository } from '../repositories/contentRepository';
import { SubjectRepository } from '../repositories/subjectRepository';
import { z } from 'zod';
import { createContentSchema, updateContentSchema } from '../schemas/contentSchemas';
import { Prisma, Role } from '@prisma/client';
import { Requester } from './studentService';

const repository = new ContentRepository();
const subjectRepository = new SubjectRepository();

export class ContentService {
  async getAll(page: number, limit: number, requester?: Requester) {
    const skip = (page - 1) * limit;
    let where: Prisma.ContentWhereInput | undefined;

    if (requester?.role === Role.PROFESSOR) {
      where = {
        subject: {
          classes: {
            some: {
              teacher: { userId: requester.id }
            }
          }
        }
      };
    } else if (requester?.role === Role.ALUNO) {
      where = {
        subject: {
          classes: {
            some: {
              enrollments: {
                some: {
                  student: { userId: requester.id },
                  status: 'ACTIVE'
                }
              }
            }
          }
        }
      };
    }

    const total = await repository.count(where);
    const data = await repository.findAll(skip, limit, where);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string, requester?: Requester) {
    const entity = await repository.findById(id);
    if (!entity) throw { status: 404, message: 'Conteúdo não encontrado', code: 'CONTENT_NOT_FOUND' };

    if (requester?.role === Role.PROFESSOR) {
      const teachesSubject = entity.subject?.classes?.some(
        (c) => c.teacher?.userId === requester.id
      );
      if (!teachesSubject) {
        throw {
          status: 403,
          message: 'Acesso negado. Este conteúdo pertence a uma disciplina fora das suas turmas.',
          code: 'FORBIDDEN'
        };
      }
    }

    if (requester?.role === Role.ALUNO) {
      const isEnrolledInSubject = entity.subject?.classes?.some((c) =>
        c.enrollments?.some(
          (e) => e.student?.userId === requester.id && e.status === 'ACTIVE'
        )
      );
      if (!isEnrolledInSubject) {
        throw {
          status: 403,
          message: 'Acesso negado. Você não possui matrícula ativa em turma desta disciplina.',
          code: 'FORBIDDEN'
        };
      }
    }

    return entity;
  }

  async create(data: z.infer<typeof createContentSchema>, requester?: Requester) {
    if (requester && requester.role !== Role.ADMIN) {
      throw {
        status: 403,
        message: 'Acesso negado. Apenas administradores podem cadastrar conteúdos programáticos.',
        code: 'FORBIDDEN'
      };
    }

    const subject = await subjectRepository.findById(data.subjectId);
    if (!subject) {
      throw { status: 404, message: 'Disciplina não encontrada', code: 'SUBJECT_NOT_FOUND' };
    }

    return repository.create(data);
  }

  async update(id: string, data: z.infer<typeof updateContentSchema>, requester?: Requester) {
    if (requester && requester.role !== Role.ADMIN) {
      throw {
        status: 403,
        message: 'Acesso negado. Apenas administradores podem editar conteúdos programáticos.',
        code: 'FORBIDDEN'
      };
    }

    const existing = await this.getById(id);

    if (data.subjectId && data.subjectId !== existing.subjectId) {
      const targetSubject = await subjectRepository.findById(data.subjectId);
      if (!targetSubject) {
        throw { status: 404, message: 'Disciplina não encontrada', code: 'SUBJECT_NOT_FOUND' };
      }

      if (existing.activities && existing.activities.length > 0) {
        throw {
          status: 409,
          message: 'Não é possível alterar a disciplina de um conteúdo que já possui atividades vinculadas.',
          code: 'CONTENT_HAS_DEPENDENCIES'
        };
      }
    }

    return repository.update(id, data);
  }

  async delete(id: string, requester?: Requester) {
    if (requester && requester.role !== Role.ADMIN) {
      throw {
        status: 403,
        message: 'Acesso negado. Apenas administradores podem excluir conteúdos programáticos.',
        code: 'FORBIDDEN'
      };
    }

    const existing = await this.getById(id);

    if (existing.activities && existing.activities.length > 0) {
      throw {
        status: 409,
        message: 'Não é possível excluir este conteúdo pois existem atividades avaliativas vinculadas a ele.',
        code: 'CONTENT_HAS_DEPENDENCIES'
      };
    }

    return repository.delete(id);
  }
}
