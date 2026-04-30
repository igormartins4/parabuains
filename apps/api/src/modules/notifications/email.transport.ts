import { Resend } from 'resend';

export class EmailTransport {
  private _resend: Resend | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
  ) {}

  private get resend(): Resend {
    if (!this._resend) {
      this._resend = new Resend(this.apiKey);
    }
    return this._resend;
  }

  async sendBirthdayReminder(params: {
    to: string;
    recipientName: string;
    birthdayPersonName: string;
    daysUntil: number;
    birthMonthDay: string; // "MM-DD"
  }): Promise<void> {
    const subject =
      params.daysUntil === 0
        ? `Hoje é o aniversário de ${params.birthdayPersonName}!`
        : `Lembrete: aniversário de ${params.birthdayPersonName} em ${params.daysUntil} dia${params.daysUntil > 1 ? 's' : ''}`;

    const [month, day] = params.birthMonthDay.split('-');
    const dateStr = `${day}/${month}`;

    const text =
      params.daysUntil === 0
        ? `Olá ${params.recipientName}!\n\nHoje é o aniversário de ${params.birthdayPersonName} (${dateStr}). Não se esqueça de mandar uma mensagem especial!\n\nAcesse Parabuains para enviar seus parabéns.`
        : `Olá ${params.recipientName}!\n\nLembrete: o aniversário de ${params.birthdayPersonName} é dia ${dateStr} — faltam ${params.daysUntil} dia${params.daysUntil > 1 ? 's' : ''}.\n\nAcesse Parabuains para se preparar!`;

    await this.resend.emails.send({
      from: this.fromEmail,
      to: params.to,
      subject,
      text,
    });
  }

  async sendWallMessageNotification(params: {
    to: string;
    recipientName: string;
    senderName: string | null;
    profileUsername: string;
  }): Promise<void> {
    const senderText = params.senderName ? `${params.senderName}` : 'Alguém';

    await this.resend.emails.send({
      from: this.fromEmail,
      to: params.to,
      subject: 'Você recebeu uma mensagem no seu mural',
      text: `Olá ${params.recipientName}!\n\n${senderText} deixou uma mensagem no seu mural do Parabuains.\n\nAcesse parabuains.com/${params.profileUsername} para ver a mensagem.`,
    });
  }

  async sendFriendshipAcceptedNotification(params: {
    to: string;
    recipientName: string;
    friendName: string;
    friendUsername: string;
  }): Promise<void> {
    await this.resend.emails.send({
      from: this.fromEmail,
      to: params.to,
      subject: `${params.friendName} aceitou seu pedido de amizade`,
      text: `Olá ${params.recipientName}!\n\n${params.friendName} aceitou seu pedido de amizade no Parabuains. Agora vocês são amigos!\n\nAcesse parabuains.com/${params.friendUsername} para ver o perfil de ${params.friendName}.`,
    });
  }
}
