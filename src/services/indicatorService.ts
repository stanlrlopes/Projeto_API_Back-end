import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class IndicatorService {
  async getStudentAverage(studentId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw { status: 404, message: 'Aluno não encontrado', code: 'STUDENT_NOT_FOUND' };

    const grades = await prisma.grade.findMany({ where: { studentId } });
    if (grades.length === 0) return { studentId, average: 0 };

    const avg = grades.reduce((acc, curr) => acc + curr.score, 0) / grades.length;
    return { studentId, average: Number(avg.toFixed(2)) };
  }

  async getStudentAttendance(studentId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw { status: 404, message: 'Aluno não encontrado', code: 'STUDENT_NOT_FOUND' };

    const attendances = await prisma.attendance.findMany({ where: { studentId } });
    const totalClasses = attendances.length;
    const present = attendances.filter((a) => a.present).length;
    const absent = totalClasses - present;
    const attendancePercentage = totalClasses === 0 ? 0 : (present / totalClasses) * 100;

    return {
      studentId,
      totalClasses,
      present,
      absent,
      attendancePercentage: Number(attendancePercentage.toFixed(2))
    };
  }

  async getLowPerformanceStudents() {
    const students = await prisma.student.findMany({ include: { grades: true } });
    
    const lowPerformance = students
      .map((student) => {
        if (student.grades.length === 0) return null;
        const avg = student.grades.reduce((acc, curr) => acc + curr.score, 0) / student.grades.length;
        return { studentId: student.id, name: student.name, average: Number(avg.toFixed(2)) };
      })
      .filter((s) => s !== null && s.average < 6.0);
      
    return lowPerformance;
  }

  async getDashboard() {
    const [totalStudents, totalTeachers, totalClasses, totalSubjects, allGrades, allAttendances] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.subject.count(),
      prisma.grade.findMany(),
      prisma.attendance.findMany()
    ]);

    const generalAverage = allGrades.length === 0 
      ? 0 
      : allGrades.reduce((acc, curr) => acc + curr.score, 0) / allGrades.length;

    const totalAttendances = allAttendances.length;
    const totalPresents = allAttendances.filter((a) => a.present).length;
    const generalAttendancePercentage = totalAttendances === 0 
      ? 0 
      : (totalPresents / totalAttendances) * 100;

    const lowPerformanceStudents = await this.getLowPerformanceStudents();

    return {
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      generalAverage: Number(generalAverage.toFixed(2)),
      generalAttendancePercentage: Number(generalAttendancePercentage.toFixed(2)),
      lowPerformanceCount: lowPerformanceStudents.length
    };
  }
}
