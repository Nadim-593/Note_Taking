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

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
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

  interests: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .max(20)
    .default([]),

  // role is intentionally absent — public registration cannot assign a role
});

export const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required().messages({
    'any.required': 'Email is required',
  }),

  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});
