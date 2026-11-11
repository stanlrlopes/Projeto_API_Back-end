import { Router } from 'express';
import { IndicatorController } from '../controllers/indicatorController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { roleMiddleware } from '../middlewares/roleMiddleware';
import { Role } from '@prisma/client';

const router = Router();
const controller = new IndicatorController();

router.use(authMiddleware);

// Rotas individuais de alunos (ALUNO, PROFESSOR, ADMIN) - o controlador filtra caso seja ALUNO tentando ver outro ALUNO
router.get('/students/:id/average', controller.getAverage.bind(controller));
router.get('/students/:id/attendance', controller.getAttendance.bind(controller));

// Rotas exclusivas de PROFESSOR e ADMIN (relatórios e inteligência de negócios)
router.get('/low-performance', roleMiddleware([Role.ADMIN, Role.PROFESSOR]), controller.getLowPerformance.bind(controller));
router.get('/dashboard', roleMiddleware([Role.ADMIN, Role.PROFESSOR]), controller.getDashboard.bind(controller));

export default router;
