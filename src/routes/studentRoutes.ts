import { Router } from 'express';
import { StudentController } from '../controllers/studentController';
import { validate } from '../middlewares/validateMiddleware';
import { createStudentSchema, updateStudentSchema } from '../schemas/basicSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new StudentController();

// Todos os endpoints protegidos por auth
router.use(authMiddleware);

// Qualquer perfil logado pode visualizar alunos
router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));

// Apenas ADMIN pode criar, atualizar ou deletar registros bases
router.post('/', roleMiddleware([Role.ADMIN]), validate(createStudentSchema), controller.create.bind(controller));
router.put('/:id', roleMiddleware([Role.ADMIN]), validate(updateStudentSchema), controller.update.bind(controller));
router.delete('/:id', roleMiddleware([Role.ADMIN]), controller.delete.bind(controller));

export default router;
