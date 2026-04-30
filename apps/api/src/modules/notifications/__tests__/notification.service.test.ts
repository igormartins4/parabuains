import { describe, expect, it, vi } from 'vitest';
import type { EmailTransport } from '../email.transport.js';
import type { IUserLookup } from '../notification.service.js';
import { NotificationService } from '../notification.service.js';
import type { INotificationLogRepository } from '../notification-log.repository.js';
import type {
  INotificationPreferencesRepository,
  NotificationPreference,
} from '../notification-preferences.repository.js';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function makePrefsRepo(
  overrides: Partial<INotificationPreferencesRepository> = {}
): INotificationPreferencesRepository {
  return {
    getByUserId: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue({
      id: 'pref-uuid',
      userId: 'user-uuid',
      channel: 'email',
      daysBefore: [1, 7],
      enabled: true,
      updatedAt: new Date(),
    } satisfies NotificationPreference),
    ...overrides,
  };
}

function makeLogRepo(
  overrides: Partial<INotificationLogRepository> = {}
): INotificationLogRepository {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    existsForYear: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function makeEmailTransport(): EmailTransport {
  return {
    sendBirthdayReminder: vi.fn().mockResolvedValue(undefined),
    sendWallMessageNotification: vi.fn().mockResolvedValue(undefined),
    sendFriendshipAcceptedNotification: vi.fn().mockResolvedValue(undefined),
  } as unknown as EmailTransport;
}

function makeUserRepo(
  users: Record<string, { id: string; email: string; displayName: string; username: string }>
): IUserLookup {
  return {
    findById: vi.fn().mockImplementation((id: string) => Promise.resolve(users[id] ?? null)),
  };
}

const profileUser = {
  id: 'profile-uuid',
  email: 'profile@test.com',
  displayName: 'Usuário Perfil',
  username: 'profile',
};
const authorUser = {
  id: 'author-uuid',
  email: 'author@test.com',
  displayName: 'Autor Teste',
  username: 'autor',
};
const requesterUser = {
  id: 'requester-uuid',
  email: 'req@test.com',
  displayName: 'Solicitante',
  username: 'solicitante',
};
const actorUser = {
  id: 'actor-uuid',
  email: 'actor@test.com',
  displayName: 'Ator',
  username: 'ator',
};

// ─── getPreferences ──────────────────────────────────────────────────────────

describe('NotificationService.getPreferences', () => {
  it('retorna array vazio quando usuario nao tem preferencias', async () => {
    const service = new NotificationService(
      makePrefsRepo({ getByUserId: vi.fn().mockResolvedValue([]) }),
      makeLogRepo(),
      makeEmailTransport(),
      makeUserRepo({})
    );
    const result = await service.getPreferences('user-uuid');
    expect(result).toEqual([]);
  });

  it('retorna preferencias do usuario', async () => {
    const pref: NotificationPreference = {
      id: 'pref-1',
      userId: 'user-uuid',
      channel: 'email',
      daysBefore: [1, 3, 7],
      enabled: true,
      updatedAt: new Date(),
    };
    const service = new NotificationService(
      makePrefsRepo({ getByUserId: vi.fn().mockResolvedValue([pref]) }),
      makeLogRepo(),
      makeEmailTransport(),
      makeUserRepo({})
    );
    const result = await service.getPreferences('user-uuid');
    expect(result).toHaveLength(1);
    expect(result[0]?.channel).toBe('email');
    expect(result[0]?.daysBefore).toEqual([1, 3, 7]);
  });
});

// ─── upsertPreference ────────────────────────────────────────────────────────

describe('NotificationService.upsertPreference', () => {
  it('faz upsert de preferencia email habilitada', async () => {
    const upsertMock = vi.fn().mockResolvedValue({
      id: 'pref-email',
      userId: 'user-uuid',
      channel: 'email',
      daysBefore: [1, 7],
      enabled: true,
      updatedAt: new Date(),
    } satisfies NotificationPreference);

    const service = new NotificationService(
      makePrefsRepo({ upsert: upsertMock }),
      makeLogRepo(),
      makeEmailTransport(),
      makeUserRepo({})
    );

    const result = await service.upsertPreference('user-uuid', 'email', [1, 7], true);
    expect(upsertMock).toHaveBeenCalledWith('user-uuid', 'email', [1, 7], true);
    expect(result.channel).toBe('email');
    expect(result.enabled).toBe(true);
  });

  it('faz upsert de preferencia push desabilitada', async () => {
    const upsertMock = vi.fn().mockResolvedValue({
      id: 'pref-push',
      userId: 'user-uuid',
      channel: 'push',
      daysBefore: [],
      enabled: false,
      updatedAt: new Date(),
    } satisfies NotificationPreference);

    const service = new NotificationService(
      makePrefsRepo({ upsert: upsertMock }),
      makeLogRepo(),
      makeEmailTransport(),
      makeUserRepo({})
    );

    const result = await service.upsertPreference('user-uuid', 'push', [], false);
    expect(upsertMock).toHaveBeenCalledWith('user-uuid', 'push', [], false);
    expect(result.channel).toBe('push');
    expect(result.enabled).toBe(false);
  });
});

// ─── handleWallMessagePosted ─────────────────────────────────────────────────

describe('NotificationService.handleWallMessagePosted', () => {
  it('envia email quando preferencia email esta habilitada', async () => {
    const emailPrefs: NotificationPreference[] = [
      {
        id: 'p1',
        userId: 'profile-uuid',
        channel: 'email',
        daysBefore: [],
        enabled: true,
        updatedAt: new Date(),
      },
    ];
    const emailTransport = makeEmailTransport();
    const logRepo = makeLogRepo();

    const service = new NotificationService(
      makePrefsRepo({ getByUserId: vi.fn().mockResolvedValue(emailPrefs) }),
      logRepo,
      emailTransport,
      makeUserRepo({ 'profile-uuid': profileUser, 'author-uuid': authorUser })
    );

    await service.handleWallMessagePosted('profile-uuid', 'author-uuid');

    expect(emailTransport.sendWallMessageNotification).toHaveBeenCalledOnce();
    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'profile-uuid', status: 'sent' })
    );
  });

  it('NAO envia email quando preferencia email esta desabilitada', async () => {
    const disabledPrefs: NotificationPreference[] = [
      {
        id: 'p1',
        userId: 'profile-uuid',
        channel: 'email',
        daysBefore: [],
        enabled: false,
        updatedAt: new Date(),
      },
    ];
    const emailTransport = makeEmailTransport();

    const service = new NotificationService(
      makePrefsRepo({ getByUserId: vi.fn().mockResolvedValue(disabledPrefs) }),
      makeLogRepo(),
      emailTransport,
      makeUserRepo({ 'profile-uuid': profileUser })
    );

    await service.handleWallMessagePosted('profile-uuid', 'author-uuid');

    expect(emailTransport.sendWallMessageNotification).not.toHaveBeenCalled();
  });

  it('NAO envia email quando usuario nao tem preferencias (padrao off)', async () => {
    const emailTransport = makeEmailTransport();

    const service = new NotificationService(
      makePrefsRepo({ getByUserId: vi.fn().mockResolvedValue([]) }),
      makeLogRepo(),
      emailTransport,
      makeUserRepo({ 'profile-uuid': profileUser })
    );

    await service.handleWallMessagePosted('profile-uuid', 'author-uuid');

    expect(emailTransport.sendWallMessageNotification).not.toHaveBeenCalled();
  });

  it('trata remetente anonimo (null authorId) sem erros', async () => {
    const emailPrefs: NotificationPreference[] = [
      {
        id: 'p1',
        userId: 'profile-uuid',
        channel: 'email',
        daysBefore: [],
        enabled: true,
        updatedAt: new Date(),
      },
    ];
    const emailTransport = makeEmailTransport();

    const service = new NotificationService(
      makePrefsRepo({ getByUserId: vi.fn().mockResolvedValue(emailPrefs) }),
      makeLogRepo(),
      emailTransport,
      makeUserRepo({ 'profile-uuid': profileUser })
    );

    await service.handleWallMessagePosted('profile-uuid', null);

    expect(emailTransport.sendWallMessageNotification).toHaveBeenCalledWith(
      expect.objectContaining({ senderName: null })
    );
  });

  it('registra log apos envio de email com sucesso', async () => {
    const emailPrefs: NotificationPreference[] = [
      {
        id: 'p1',
        userId: 'profile-uuid',
        channel: 'email',
        daysBefore: [],
        enabled: true,
        updatedAt: new Date(),
      },
    ];
    const logRepo = makeLogRepo();

    const service = new NotificationService(
      makePrefsRepo({ getByUserId: vi.fn().mockResolvedValue(emailPrefs) }),
      logRepo,
      makeEmailTransport(),
      makeUserRepo({ 'profile-uuid': profileUser, 'author-uuid': authorUser })
    );

    await service.handleWallMessagePosted('profile-uuid', 'author-uuid');

    expect(logRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: 'profile-uuid',
        channel: 'email',
        reminderType: 'Dday',
        status: 'sent',
      })
    );
  });
});

// ─── handleFriendshipAccepted ─────────────────────────────────────────────────

describe('NotificationService.handleFriendshipAccepted', () => {
  it('envia email quando preferencia email esta habilitada', async () => {
    const emailPrefs: NotificationPreference[] = [
      {
        id: 'p1',
        userId: 'requester-uuid',
        channel: 'email',
        daysBefore: [],
        enabled: true,
        updatedAt: new Date(),
      },
    ];
    const emailTransport = makeEmailTransport();

    const service = new NotificationService(
      makePrefsRepo({ getByUserId: vi.fn().mockResolvedValue(emailPrefs) }),
      makeLogRepo(),
      emailTransport,
      makeUserRepo({ 'requester-uuid': requesterUser, 'actor-uuid': actorUser })
    );

    await service.handleFriendshipAccepted('requester-uuid', 'actor-uuid');

    expect(emailTransport.sendFriendshipAcceptedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: requesterUser.email,
        friendName: actorUser.displayName,
      })
    );
  });

  it('NAO envia email quando preferencia email esta desabilitada', async () => {
    const disabledPrefs: NotificationPreference[] = [
      {
        id: 'p1',
        userId: 'requester-uuid',
        channel: 'email',
        daysBefore: [],
        enabled: false,
        updatedAt: new Date(),
      },
    ];
    const emailTransport = makeEmailTransport();

    const service = new NotificationService(
      makePrefsRepo({ getByUserId: vi.fn().mockResolvedValue(disabledPrefs) }),
      makeLogRepo(),
      emailTransport,
      makeUserRepo({ 'requester-uuid': requesterUser })
    );

    await service.handleFriendshipAccepted('requester-uuid', 'actor-uuid');

    expect(emailTransport.sendFriendshipAcceptedNotification).not.toHaveBeenCalled();
  });

  it('NAO envia quando destinatario nao encontrado', async () => {
    const emailTransport = makeEmailTransport();

    const service = new NotificationService(
      makePrefsRepo(),
      makeLogRepo(),
      emailTransport,
      makeUserRepo({}) // empty — user not found
    );

    await service.handleFriendshipAccepted('nonexistent-uuid', 'actor-uuid');

    expect(emailTransport.sendFriendshipAcceptedNotification).not.toHaveBeenCalled();
  });
});
