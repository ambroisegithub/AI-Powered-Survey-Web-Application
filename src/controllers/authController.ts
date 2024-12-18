import supabase from '../config/supabase';
import bcrypt from 'bcrypt';
interface ConfirmRequest {
  query: {
    access_token: string;
    expires_at: string;
    refresh_token: string;
    token_type: string;
    type: string;
  };
}

interface ConfirmResponse {
  status: (code: number) => ConfirmResponse;
  json: (data: any) => void;
}


interface SignUpRequest {
  body: {
    email: string;
    password: string;
    username: string; 
  };
}

interface SignUpResponse {
  status: (code: number) => SignUpResponse;
  json: (data: any) => void;
}

export const signUp = async (req: SignUpRequest, res: SignUpResponse) => {
  const { email, password, username } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

  if (authError) return res.status(400).json({ error: authError.message });

  const { data: userData, error: dbError } = await supabase.from('users').insert([
    {
      id: authData.user?.id,
      email: authData.user?.email,
      username, 
      password: hashedPassword, 
    },
  ]);

  if (dbError) return res.status(400).json({ error: dbError.message });

  res.json({ message: 'User created successfully', user: userData });
};


interface SignInRequest {
  body: {
    email: string;
    password: string;
  };
}

interface SignInResponse {
  status: (code: number) => SignInResponse;
  json: (data: any) => void;
}

export const signIn = async (req: SignInRequest, res: SignInResponse) => {
  const { email, password } = req.body;
  const { data: session, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: error.message });
  res.json(session);
};



export const confirmSignUp = async (req: ConfirmRequest, res: ConfirmResponse) => {
  const { access_token, type } = req.query;

  if (!access_token || type !== 'signup') {
    return res.status(400).json({ error: 'Invalid confirmation URL' });
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token: req.query.refresh_token || '',
  });

  if (error) return res.status(400).json({ error: error.message });

  res.status(200).json({
    message: 'Signup confirmation successful',
    user: data.user,
  });
};

