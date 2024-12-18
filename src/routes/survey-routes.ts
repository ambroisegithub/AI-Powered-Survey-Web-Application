// @ts-nocheck
import express from 'express';
import { getSurveys, getSurveyById, createSurvey, updateSurvey, deleteSurvey, submitResponse ,addQuestion, addOption} from '../controllers/survey-controller';
import { createAISurvey } from '../controllers/ai-survey-controller';
const router = express.Router();
router.get('/', getSurveys);
router.get('/:id', getSurveyById);
router.post('/',  createSurvey);
router.put('/:id',  updateSurvey);
router.delete('/:id', deleteSurvey);
router.post('/responses', submitResponse);
router.post('/:survey_id/questions', addQuestion);
router.post('/options/:question_id', addOption);
router.post('/ai-survey', createAISurvey);

export default router;