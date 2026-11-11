import { Router } from 'express';
import { ActivityController } from '../controllers/activityController';
import { validate } from '../middlewares/validateMiddleware';
import { createActivitySchema, updateActivitySchema } from '../schemas/contentSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new ActivityController();

router.use(authMiddleware);

router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', roleMiddleware([Role.ADMIN, Role.PROFESSOR]), validate(createActivitySchema), controller.create.bind(controller));
router.put('/:id', roleMiddleware([Role.ADMIN, Role.PROFESSOR]), validate(updateActivitySchema), controller.update.bind(controller));
router.delete('/:id', roleMiddleware([Role.ADMIN, Role.PROFESSOR]), controller.delete.bind(controller));

export default router;
