import { Router } from 'express';
import { ClassController } from '../controllers/classController';
import { validate } from '../middlewares/validateMiddleware';
import { createClassSchema, updateClassSchema } from '../schemas/academicSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new ClassController();

router.use(authMiddleware);

router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', roleMiddleware([Role.ADMIN]), validate(createClassSchema), controller.create.bind(controller));
router.put('/:id', roleMiddleware([Role.ADMIN]), validate(updateClassSchema), controller.update.bind(controller));
router.delete('/:id', roleMiddleware([Role.ADMIN]), controller.delete.bind(controller));

export default router;
