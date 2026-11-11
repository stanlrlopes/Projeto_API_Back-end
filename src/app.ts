import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/authRoutes';
import studentRoutes from './routes/studentRoutes';
import teacherRoutes from './routes/teacherRoutes';
import subjectRoutes from './routes/subjectRoutes';
import classRoutes from './routes/classRoutes';
import enrollmentRoutes from './routes/enrollmentRoutes';
import contentRoutes from './routes/contentRoutes';
import activityRoutes from './routes/activityRoutes';
import gradeRoutes from './routes/gradeRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import indicatorRoutes from './routes/indicatorRoutes';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';

const app: Application = express();

const swaggerPath = path.resolve(__dirname, './docs/swagger.json');
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/indicators', indicatorRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      message: 'EducaAPI está rodando com sucesso!',
      timestamp: new Date().toISOString()
    }
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Erro Não Tratado]: ${err.message}`);
  
  res.status(500).json({
    success: false,
    error: {
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    }
  });
});

export default app;
