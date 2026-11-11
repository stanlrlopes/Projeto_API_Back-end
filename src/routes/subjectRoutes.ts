import { Router } from 'express';
import { SubjectController } from '../controllers/subjectController';
import { validate } from '../middlewares/validateMiddleware';
import { createSubjectSchema, updateSubjectSchema } from '../schemas/basicSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new SubjectController();

router.use(authMiddleware);

router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', roleMiddleware([Role.ADMIN]), validate(createSubjectSchema), controller.create.bind(controller));
router.put('/:id', roleMiddleware([Role.ADMIN]), validate(updateSubjectSchema), controller.update.bind(controller));
router.delete('/:id', roleMiddleware([Role.ADMIN]), controller.delete.bind(controller));

export default router;
