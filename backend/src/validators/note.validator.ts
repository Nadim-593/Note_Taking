import Joi from 'joi';

export const createNoteSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Title cannot be empty',
    'string.min': 'Title must be at least 1 character long',
    'string.max': 'Title must not exceed 200 characters',
    'any.required': 'Title is required',
  }),

  content: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Content cannot be empty',
    'string.min': 'Content must be at least 1 character long',
    'any.required': 'Content is required',
  }),
});

export const updateNoteSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).messages({
    'string.empty': 'Title cannot be empty',
    'string.min': 'Title must be at least 1 character long',
    'string.max': 'Title must not exceed 200 characters',
  }),

  content: Joi.string().trim().min(1).messages({
    'string.empty': 'Content cannot be empty',
    'string.min': 'Content must be at least 1 character long',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field (title or content) must be provided for update',
  });

export const queryNoteSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),

  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100',
  }),
});
