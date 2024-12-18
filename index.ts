import express from 'express';
import bodyParser from 'body-parser';
import surveyRoutes from './src/routes/survey-routes';
import authRoutes from './src/routes/auth-routes';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
import supabase from './src/config/supabase';
import cors from 'cors';
dotenv.config();

const app = express();

app.use(cors());
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.use('/surveys', surveyRoutes);
app.use('/auth', authRoutes);

interface Error {
  stack?: string;
  message?: string;
}
app.use((err: Error, _req: Request, res: Response, _next: Function) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const checkDatabaseConnection = async () => {
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.error('Failed to connect to the database:', error.message);
  } else {
    console.log('Database connected successfully');
  }
};

app.listen(port, async () => {
  await checkDatabaseConnection();
  console.log(`Server is running on port ${port}`);
});

export default app;