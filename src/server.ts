import dotenv from 'dotenv';
import app from './app';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`[Servidor]: EducaAPI iniciada e escutando na porta ${PORT}`);
});

process.on('SIGINT', () => {
  console.log('\n[Servidor]: Encerrando a aplicação...');
  server.close(() => {
    console.log('[Servidor]: Aplicação encerrada com sucesso.');
    process.exit(0);
  });
});
