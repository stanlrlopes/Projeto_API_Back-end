import { Router } from 'express';
import { TeacherController } from '../controllers/teacherController';
import { validate } from '../middlewares/validateMiddleware';
import { createTeacherSchema, updateTeacherSchema } from '../schemas/basicSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new TeacherController();

router.use(authMiddleware);

router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', roleMiddleware([Role.ADMIN]), validate(createTeacherSchema), controller.create.bind(controller));
router.put('/:id', roleMiddleware([Role.ADMIN]), validate(updateTeacherSchema), controller.update.bind(controller));
router.delete('/:id', roleMiddleware([Role.ADMIN]), controller.delete.bind(controller));

export default router;
