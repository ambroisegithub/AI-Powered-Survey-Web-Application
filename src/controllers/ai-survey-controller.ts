import { Request, Response } from 'express';
import { generateSurveyQuestions } from '../services/ai-service';
import supabase from '../config/supabase';

interface CreateAISurveyRequest extends Request {
  body: {
    title: string;
    description: string;
    creator_id: string;
    topic: string;
  };
}

export const createAISurvey = async (req: CreateAISurveyRequest, res: Response): Promise<Response> => {
  try {
    const { title, description, creator_id, topic } = req.body;

    if (!title || !description || !creator_id || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', creator_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Invalid creator_id' 
      });
    }

    const generatedQuestions = await generateSurveyQuestions(topic);

    const { data: surveyData, error: surveyError } = await supabase
      .from('surveys')
      .insert([{ title, description, creator_id }])
      .select()
      .single();

    if (surveyError || !surveyData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Failed to create survey' 
      });
    }

    const questionsToInsert = generatedQuestions.map(q => ({
      survey_id: surveyData.id,
      question_text: q.question_text,
      question_type: q.question_type
    }));

    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (questionsError) {
      await supabase.from('surveys').delete().eq('id', surveyData.id);
      return res.status(400).json({ 
        success: false, 
        error: 'Failed to add questions' 
      });
    }

    return res.status(201).json({
      success: true,
      message: 'AI Survey created successfully',
      data: {
        survey: surveyData,
        questions: questionsData
      }
    });
  } catch (error) {
    console.error('Error in createAISurvey:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};