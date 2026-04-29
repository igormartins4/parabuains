import { resend, FROM_EMAIL } from './resend';

interface VerificationEmailParams {
  to: string;
  url: string;
}

interface PasswordResetEmailParams {
  to: string;
  url: string;
}

export async function sendVerificationEmail({ to, url }: VerificationEmailParams): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Verifique seu e-mail — Parabuains',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Bem-vindo ao Parabuains!</h2>
        <p>Clique no link abaixo para verificar seu e-mail:</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;">
          Verificar e-mail
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px;">
          Este link expira em 24 horas. Se nao solicitou o cadastro, ignore este e-mail.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('[Email] sendVerificationEmail failed:', error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail({ to, url }: PasswordResetEmailParams): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Redefinir senha — Parabuains',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Redefinir sua senha</h2>
        <p>Clique no link abaixo para redefinir sua senha:</p>
        <a href="${url}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;">
          Redefinir senha
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px;">
          Este link expira em 1 hora. Se nao solicitou a redefinicao, ignore este e-mail.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('[Email] sendPasswordResetEmail failed:', error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
