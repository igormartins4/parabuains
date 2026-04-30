import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'test') {
}

export const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder');
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@parabuains.com';
