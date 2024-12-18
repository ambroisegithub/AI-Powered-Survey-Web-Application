// @ts-nocheck
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

interface ValidationError {
    msg: string;
    param: string;
    location: string;
}

export const validateSurvey = [
    body('title').isString().notEmpty(),
    body('description').isString().optional(),
    body('creator_id').isUUID(),
    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() as ValidationError[] });
        }
        next();
    }
];