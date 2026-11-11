import { ActivityRepository } from '../repositories/activityRepository';
import { ClassRepository } from '../repositories/classRepository';
import { ContentRepository } from '../repositories/contentRepository';
import { z } from 'zod';
import { createActivitySchema, updateActivitySchema } from '../schemas/contentSchemas';
import { Prisma, Role } from '@prisma/client';
import { Requester } from './studentService';

const repository = new ActivityRepository();
const classRepository = new ClassRepository();
const contentRepository = new ContentRepository();

export class ActivityService {
  async getAll(page: number, limit: number, requester?: Requester) {
    const skip = (page - 1) * limit;
    let where: Prisma.ActivityWhereInput | undefined;
    if (requester?.role === Role.ALUNO) {
      where = {
        class: {
          enrollments: {
            some: {
              student: { userId: requester.id },
              status: 'ACTIVE'
            }
          }
        }
      };
    } else if (requester?.role === Role.PROFESSOR) {
      where = {
        class: {
          teacher: { userId: requester.id }
        }
      };
    }
    const total = await repository.count(where);
    const data = await repository.findAll(skip, limit, where);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string, requester?: Requester) {
    const entity = await repository.findById(id);
    if (!entity) throw { status: 404, message: 'Atividade não encontrada', code: 'ACTIVITY_NOT_FOUND' };
    if (requester?.role === Role.ALUNO) {
      const isEnrolled = entity.class?.enrollments?.some(
        (e) => e.student?.userId === requester.id && e.status === 'ACTIVE'
      );
      if (!isEnrolled) {
        throw { status: 403, message: 'Acesso negado. Você não possui matrícula ativa na turma desta atividade.', code: 'FORBIDDEN' };
      }
    }
    if (requester?.role === Role.PROFESSOR && entity.class?.teacher?.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Esta atividade pertence a uma turma de outro professor.', code: 'FORBIDDEN' };
    }
    return entity;
  }

  async create(data: z.infer<typeof createActivitySchema>, requester?: Requester) {
    const classEntity = await classRepository.findById(data.classId);
    if (!classEntity) throw { status: 404, message: 'Turma não encontrada', code: 'CLASS_NOT_FOUND' };

    if (requester?.role === Role.PROFESSOR && classEntity.teacher?.userId !== requester.id) {
      throw { status: 403, message: 'Acesso negado. Você só pode criar atividades nas suas próprias turmas.', code: 'FORBIDDEN' };
    }

    const contentEntity = await contentRepository.findById(data.contentId);
    if (!contentEntity) {
      throw { status: 404, message: 'Conteúdo não encontrado', code: 'CONTENT_NOT_FOUND' };
    }

    if (
      contentEntity.subjectId &&
      classEntity.subjectId &&
      contentEntity.subjectId !== classEntity.subjectId
    ) {
      throw {
        status: 409,
        message: 'O conteúdo selecionado pertence a uma disciplina diferente da disciplina da turma.',
        code: 'INCOMPATIBLE_CONTENT_SUBJECT'
      };
    }

    return repository.create(data);
  }

  async update(id: string, data: z.infer<typeof updateActivitySchema>, requester?: Requester) {
    const existing = await this.getById(id, requester);

    let effectiveClass = existing.class as {
      id: string;
      subjectId?: string;
      teacher?: { userId?: string };
    } | undefined;

    if (data.classId) {
      const targetClass = await classRepository.findById(data.classId);
      if (!targetClass) throw { status: 404, message: 'Turma não encontrada', code: 'CLASS_NOT_FOUND' };
      if (requester?.role === Role.PROFESSOR && targetClass.teacher?.userId !== requester.id) {
        throw { status: 403, message: 'Acesso negado. Você só pode associar atividades às suas próprias turmas.', code: 'FORBIDDEN' };
      }
      if (data.classId !== existing.classId && existing.grades && existing.grades.length > 0) {
        throw {
          status: 409,
          message: 'Não é possível alterar a turma de uma atividade que já possui notas lançadas.',
          code: 'ACTIVITY_HAS_GRADES'
        };
      }
      effectiveClass = targetClass;
    } else if (!effectiveClass?.subjectId && existing.classId) {
      const loadedClass = await classRepository.findById(existing.classId);
      if (loadedClass) effectiveClass = loadedClass;
    }

    const effectiveContentId = data.contentId ?? existing.contentId;
    if ((data.contentId || data.classId) && effectiveContentId && effectiveClass?.subjectId) {
      const contentEntity =
        data.contentId && data.contentId !== existing.contentId
          ? await contentRepository.findById(data.contentId)
          : existing.content?.subjectId
            ? existing.content
            : await contentRepository.findById(effectiveContentId);

      if (data.contentId && !contentEntity) {
        throw { status: 404, message: 'Conteúdo não encontrado', code: 'CONTENT_NOT_FOUND' };
      }

      if (contentEntity?.subjectId && contentEntity.subjectId !== effectiveClass.subjectId) {
        throw {
          status: 409,
          message: 'O conteúdo selecionado pertence a uma disciplina diferente da disciplina da turma.',
          code: 'INCOMPATIBLE_CONTENT_SUBJECT'
        };
      }
    }

    if (data.maxScore !== undefined && existing.grades && existing.grades.length > 0) {
      const highestScore = Math.max(...existing.grades.map((g) => g.score));
      if (data.maxScore < highestScore) {
        throw {
          status: 409,
          message: `A nova nota máxima (${data.maxScore}) não pode ser inferior à maior nota já lançada (${highestScore}).`,
          code: 'INVALID_MAX_SCORE'
        };
      }
    }

    return repository.update(id, data);
  }

  async delete(id: string, requester?: Requester) {
    const existing = await this.getById(id, requester);
    if (existing.grades && existing.grades.length > 0) {
      throw {
        status: 409,
        message: 'Não é possível excluir uma atividade que já possui notas lançadas.',
        code: 'ACTIVITY_HAS_GRADES'
      };
    }
    return repository.delete(id);
  }
}
