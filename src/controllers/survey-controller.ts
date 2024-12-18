import supabase from '../config/supabase';
import { Request, Response } from 'express';

interface Survey {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  created_at: string;
}

interface Question {
  id: string;
  survey_id: string;
  text: string;
}

interface Option {
  id: string;
  question_id: string;
  text: string;
}

interface SurveyResponse {
  id: string;
  survey_id: string;
  user_id: string;
}

interface AnswerChoice {
  response_id: string;
  question_id: string;
  option_id: string;
}

interface GetSurveysQuery {
  creator_id?: string;
  start_date?: string;
  end_date?: string;
}

export const getSurveys = async (req: { query: GetSurveysQuery }, res: Response) => {
  try {
    const { creator_id, start_date, end_date } = req.query;
    let query = supabase.from('surveys').select('*');

    if (creator_id) {
      query = query.eq('creator_id', creator_id);
    }
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data, error } = await query;
    if (error) return res.status(400).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

interface GetSurveyByIdParams {
  id: string;
}

interface GetSurveyByIdResponse {
  survey: Survey;
  questions: Question[];
  options: Option[];
}

export const getSurveyById = async (req: { params: GetSurveyByIdParams }, res: Response) => {
  try {
    const { id } = req.params;
    const { data: survey, error: surveyError } = await supabase.from('surveys').select('*').eq('id', id).single();
    if (surveyError) return res.status(404).json({ success: false, error: 'Survey not found' });

    const { data: questions, error: questionsError } = await supabase.from('questions').select('*').eq('survey_id', id);
    if (questionsError) return res.status(400).json({ success: false, error: questionsError.message });

    const { data: options, error: optionsError } = await supabase.from('options').select('*').in('question_id', questions.map(q => q.id));
    if (optionsError) return res.status(400).json({ success: false, error: optionsError.message });

    return res.status(200).json({
      success: true,
      data: { survey, questions, options } as GetSurveyByIdResponse
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

interface CreateSurveyRequest extends Request {
  body: {
    title: string;
    description: string;
    creator_id: string;
  };
}

interface CreateSurveyResponse {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  created_at: string;
}

export const createSurvey = async (req: CreateSurveyRequest, res: Response): Promise<Response> => {
  try {
    const { title, description, creator_id } = req.body;

    if (!title || !description || !creator_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const { data: user, error: userError } = await supabase.from('users').select('id').eq('id', creator_id).single();
    if (userError || !user) {
      return res.status(404).json({ success: false, error: 'Invalid creator_id' });
    }

    const { data, error } = await supabase.from('surveys').insert([{ title, description, creator_id }]).select() as { data: CreateSurveyResponse[] | null, error: any };
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    
    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, error: 'Failed to create survey' });
    }

    return res.status(201).json({
      success: true,
      message: 'Survey created successfully',
      data: data[0] as CreateSurveyResponse
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

interface UpdateSurveyRequest {
  params: {
    id: string;
  };
  body: {
    title: string;
    description: string;
  };
}

interface UpdateSurveyResponse {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  created_at: string;
}

export const updateSurvey = async (req: UpdateSurveyRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const { data: existingSurvey, error: checkError } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingSurvey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const { data, error } = await supabase
      .from('surveys')
      .update({ title, description })
      .eq('id', id)
      .select();

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, error: 'Failed to update survey' });
    }

    return res.status(200).json({
      success: true,
      message: 'Survey updated successfully',
      data: data[0] as UpdateSurveyResponse
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};



export const deleteSurvey = async (req: any, res: any) => {
  const { id } = req.params;

  try {
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id')
      .eq('survey_id', id);

    if (questionsError) {
      throw questionsError;
    }

    if (questions && questions.length > 0) {
      const questionIds = questions.map(q => q.id);

      // 1. First delete answer choices since they reference options
      const { error: answerChoicesError } = await supabase
        .from('answerchoices')
        .delete()
        .in('question_id', questionIds);

      if (answerChoicesError) {
        throw answerChoicesError;
      }

      // 2. Then delete options since they're now safe to delete
      const { error: optionsError } = await supabase
        .from('options')
        .delete()
        .in('question_id', questionIds);

      if (optionsError) {
        throw optionsError;
      }

      // 3. Delete the questions
      const { error: questionsDeleteError } = await supabase
        .from('questions')
        .delete()
        .eq('survey_id', id);

      if (questionsDeleteError) {
        throw questionsDeleteError;
      }
    }

    // 4. Delete any survey responses
    const { error: responsesError } = await supabase
      .from('responses')
      .delete()
      .eq('survey_id', id);

    if (responsesError) {
      throw responsesError;
    }

    // 5. Finally delete the survey itself
    const { error: surveyError } = await supabase
      .from('surveys')
      .delete()
      .eq('id', id);

    if (surveyError) {
      throw surveyError;
    }

    return res.status(200).json({
      success: true,
      message: 'Survey and all related data deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting survey:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred while deleting the survey'
    });
  }
};


interface SubmitResponseRequest {
  body: {
    survey_id: string;
    user_id: string;
    answers: {
      question_id: string;
      option_id: string;
    }[];
  };
}

interface SubmitResponseResponse {
  response: SurveyResponse[];
  answerData: AnswerChoice[];
}

export const submitResponse = async (req: SubmitResponseRequest, res: Response) => {
  try {
    const { survey_id, user_id, answers } = req.body;

    if (!survey_id || !user_id || !answers || answers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const { data: existingSurvey, error: surveyError } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', survey_id)
      .single();

    if (surveyError || !existingSurvey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const { data: response, error: responseError } = await supabase
      .from('responses')
      .insert([{ survey_id, user_id }])
      .select() as { data: SurveyResponse[] | null, error: any };

    if (responseError) {
      return res.status(400).json({ success: false, error: responseError.message });
    }

    if (!response || response.length === 0) {
      return res.status(400).json({ success: false, error: 'Failed to create response' });
    }

    const response_id = response[0].id;
    const answerChoices = answers.map(answer => ({ response_id, ...answer }));
    
    const { data: answerData, error: answerError } = await supabase
      .from('answerchoices')
      .insert(answerChoices)
      .select();

    if (answerError) {
      return res.status(400).json({ success: false, error: answerError.message });
    }

    if (!answerData) {
      return res.status(400).json({ success: false, error: 'Failed to create answer choices' });
    }

    return res.status(201).json({
      success: true,
      message: 'Response submitted successfully',
      data: { response, answerData } as SubmitResponseResponse
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};


interface AddQuestionRequest extends Request {
  body: {
    question_text: string;
    question_type: string;
  };
  params: {
    survey_id: string;
  };
}

interface AddQuestionResponse {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: string;
}

export const addQuestion = async (req: AddQuestionRequest, res: Response): Promise<Response> => {
  try {
    const { survey_id } = req.params;
    const { question_text, question_type } = req.body;

    if (!survey_id || !question_text || !question_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const { data: survey, error: surveyError } = await supabase.from('surveys').select('id').eq('id', survey_id).single();
    if (surveyError || !survey) {
      return res.status(404).json({ success: false, error: 'Survey not found' });
    }

    const { data, error } = await supabase.from('questions').insert([{ survey_id, question_text, question_type }]).select() as { data: AddQuestionResponse[] | null, error: any };
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, error: 'Failed to add question' });
    }

    return res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: data[0] as AddQuestionResponse
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

interface AddOptionRequest extends Request {
  body: {
    option_text: string;
  };
  params: {
    question_id: string;
  };
}

interface AddOptionResponse {
  id: string;
  question_id: string;
  option_text: string;
}

export const addOption = async (req: AddOptionRequest, res: Response): Promise<Response> => {
  try {
    const { question_id } = req.params;
    const { option_text } = req.body;

    if (!question_id || !option_text) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const { data: question, error: questionError } = await supabase.from('questions').select('id').eq('id', question_id).single();
    if (questionError || !question) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const { data, error } = await supabase.from('options').insert([{ question_id, option_text }]).select() as { data: AddOptionResponse[] | null, error: any };
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, error: 'Failed to add option' });
    }

    return res.status(201).json({
      success: true,
      message: 'Option added successfully',
      data: data[0] as AddOptionResponse
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};