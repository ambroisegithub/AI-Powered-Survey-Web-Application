import express from 'express';
import { signUp, signIn , confirmSignUp } from '../controllers/authController';

const router = express.Router();
router.post('/signup', signUp);
router.post('/signin', signIn);
router.get('/confirm', confirmSignUp);

export default router;