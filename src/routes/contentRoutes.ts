import { Router } from 'express';
import { ContentController } from '../controllers/contentController';
import { validate } from '../middlewares/validateMiddleware';
import { createContentSchema, updateContentSchema } from '../schemas/contentSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new ContentController();

router.use(authMiddleware);

router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', roleMiddleware([Role.ADMIN]), validate(createContentSchema), controller.create.bind(controller));
router.put('/:id', roleMiddleware([Role.ADMIN]), validate(updateContentSchema), controller.update.bind(controller));
router.delete('/:id', roleMiddleware([Role.ADMIN]), controller.delete.bind(controller));

export default router;
