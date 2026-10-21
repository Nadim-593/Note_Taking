import Joi from 'joi';

const passwordRules = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[A-Z]/, 'uppercase letter')
  .pattern(/[a-z]/, 'lowercase letter')
  .pattern(/[0-9]/, 'digit')
  .messages({
    'string.pattern.name': '{{#label}} must contain at least one {{#name}}',
  });

export const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required',
  }),

  email: Joi.string().trim().lowercase().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),

  password: passwordRules.required().messages({
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password must not exceed 128 characters',
    'any.required': 'Password is required',
  }),

  role: Joi.string().valid('user', 'admin').default('user'),

  interests: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .max(20)
    .default([]),
});

export const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),

  email: Joi.string().trim().lowercase().email(),

  password: passwordRules,

  role: Joi.string().valid('user', 'admin'),

  interests: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .max(20),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

export const queryUserSchema = Joi.object({
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
