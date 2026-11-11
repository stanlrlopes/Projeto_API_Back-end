import { Router } from 'express';
import { AttendanceController } from '../controllers/attendanceController';
import { validate } from '../middlewares/validateMiddleware';
import { createAttendanceSchema, updateAttendanceSchema } from '../schemas/evaluationSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new AttendanceController();

router.use(authMiddleware);

router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', roleMiddleware([Role.ADMIN, Role.PROFESSOR]), validate(createAttendanceSchema), controller.create.bind(controller));
router.put('/:id', roleMiddleware([Role.ADMIN, Role.PROFESSOR]), validate(updateAttendanceSchema), controller.update.bind(controller));
router.delete('/:id', roleMiddleware([Role.ADMIN, Role.PROFESSOR]), controller.delete.bind(controller));

export default router;
