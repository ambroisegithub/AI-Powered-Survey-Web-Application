import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is missing in environment variables');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SurveyQuestion {
  question_text: string;
  question_type: string;
}

const retryAfter = 2 * 1000; 

export const generateSurveyQuestions = async (topic: string): Promise<SurveyQuestion[]> => {
  let attempts = 0;
  const maxRetries = 5;
  while (attempts < maxRetries) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates survey questions. Generate 5 relevant questions for the given topic. Each question should be on a new line."
          },
          {
            role: "user",
            content: `Create survey questions for the topic: ${topic}`
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      const generatedText = completion.choices[0]?.message?.content || '';
      
      // Split the text into questions and format them
      const questions = generatedText
        .split('\n')
        .filter(q => q.trim()) // Remove empty lines
        .map(q => ({
          question_text: q.replace(/^\d+\.\s*/, '').trim(), // Remove numbering if present
          question_type: 'text'
        }));

      return questions;
    } catch (error:any) {
      if (error.response?.status === 429 && attempts < maxRetries) {
        console.log(`Rate limit exceeded. Retrying in ${retryAfter / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        attempts += 1;
      } else {
        console.error('Error generating survey questions:', error);
        throw new Error('Failed to generate survey questions');
      }
    }
  }

  throw new Error('Exceeded maximum retry attempts');
};
