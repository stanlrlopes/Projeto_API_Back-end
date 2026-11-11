import { Router } from 'express';
import { EnrollmentController } from '../controllers/enrollmentController';
import { validate } from '../middlewares/validateMiddleware';
import { createEnrollmentSchema, updateEnrollmentSchema } from '../schemas/academicSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new EnrollmentController();

router.use(authMiddleware);

router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', roleMiddleware([Role.ADMIN]), validate(createEnrollmentSchema), controller.create.bind(controller));
router.put('/:id', roleMiddleware([Role.ADMIN]), validate(updateEnrollmentSchema), controller.update.bind(controller));
router.delete('/:id', roleMiddleware([Role.ADMIN]), controller.delete.bind(controller));

export default router;
