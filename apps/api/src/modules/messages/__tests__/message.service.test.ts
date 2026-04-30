import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageService, sanitizeMessage } from '../message.service.js';
import type { IMessageRepository, WallMessage } from '../message.types.js';

// ─── Mock Factories ──────────────────────────────────────────────────────────

function createMockRepo(overrides: Partial<IMessageRepository> = {}): IMessageRepository {
  return {
    findWallMessages: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    findById: vi.fn(),
    softDelete: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn(),
    createReport: vi.fn().mockResolvedValue(undefined),
    countReports: vi.fn().mockResolvedValue(0),
    findPendingByProfileId: vi.fn().mockResolvedValue([]),
    updateWallSettings: vi.fn().mockResolvedValue(undefined),
    findUserWithWallSettings: vi.fn().mockResolvedValue({
      id: 'profile-uuid',
      username: 'testuser',
      privacyLevel: 'public',
      wallWhoCanPost: 'friends',
      wallAllowAnonymous: true,
      wallRequireApproval: false,
    }),
    isFriend: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function createMockQueue() {
  return { add: vi.fn().mockResolvedValue(undefined) };
}

// ─── sanitizeMessage — XSS Prevention ───────────────────────────────────────

describe('sanitizeMessage', () => {
  it('remove tags <script> (XSS classico)', () => {
    const malicious = '<script>alert(1)</script>Feliz aniversario!';
    const result = sanitizeMessage(malicious);
    expect(result).toBe('Feliz aniversario!');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
  });

  it('remove <img onerror=...> (vetor XSS via atributo)', () => {
    const payload = '<img src=x onerror=alert(document.cookie)>mensagem';
    const result = sanitizeMessage(payload);
    expect(result).toBe('mensagem');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('onerror');
  });

  it('remove tags <style> (CSS injection)', () => {
    const payload = '<style>body{display:none}</style>texto';
    const result = sanitizeMessage(payload);
    expect(result).toBe('texto');
    expect(result).not.toContain('<style>');
  });

  it('remove tags HTML mas preserva texto', () => {
    const payload = '<b>Feliz</b> <i>aniversario</i>!';
    const result = sanitizeMessage(payload);
    expect(result).toBe('Feliz aniversario!');
  });

  it('remove payload SVG com handler de evento', () => {
    const payload = '<svg onload=alert(1)>texto</svg>';
    const result = sanitizeMessage(payload);
    expect(result).not.toContain('<svg');
    expect(result).not.toContain('onload');
  });

  it('retorna string vazia para input so com tags', () => {
    const payload = '<script>alert(1)</script>';
    const result = sanitizeMessage(payload);
    expect(result).toBe('');
  });

  it('faz trim do whitespace apos sanitizacao', () => {
    const payload = '  <b></b>  Ola  ';
    const result = sanitizeMessage(payload);
    expect(result).toBe('Ola');
  });
});

// ─── formatForResponse — Anonimato ──────────────────────────────────────────

describe('MessageService.formatForResponse — seguranca de anonimato', () => {
  let service: MessageService;

  beforeEach(() => {
    service = new MessageService(createMockRepo(), createMockQueue() as any);
  });

  it('NUNCA expoe authorId em mensagem anonima', () => {
    const anonMessage = {
      id: 'msg-001',
      profileId: 'profile-uuid',
      authorId: 'author-secret-uuid',
      isAnonymous: true,
      isPrivate: false,
      content: 'Feliz aniversario!',
      status: 'published' as const,
      createdAt: new Date(),
      author: {
        id: 'author-secret-uuid',
        username: 'secretuser',
        displayName: 'Secret User',
        avatarUrl: null,
      },
    };

    const response = service.formatForResponse(anonMessage);

    // Verificacao estrutural: campos nao devem existir no objeto
    expect(response).not.toHaveProperty('authorId');
    expect(response).not.toHaveProperty('author');

    // Verificacao de serializacao: UUID secreto nao deve vazar no JSON
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('author-secret-uuid');
    expect(serialized).not.toContain('secretuser');
    expect(serialized).not.toContain('Secret User');

    // O campo isAnonymous deve ser true
    expect(response.isAnonymous).toBe(true);
    // Os campos basicos devem estar presentes
    expect(response.id).toBe('msg-001');
    expect(response.content).toBe('Feliz aniversario!');
  });

  it('expoe authorId em mensagem publica nao-anonima', () => {
    const publicMessage = {
      id: 'msg-002',
      profileId: 'profile-uuid',
      authorId: 'author-public-uuid',
      isAnonymous: false,
      isPrivate: false,
      content: 'Parabens!',
      status: 'published' as const,
      createdAt: new Date(),
    };

    const response = service.formatForResponse(publicMessage);

    expect(response.authorId).toBe('author-public-uuid');
    expect(response.isAnonymous).toBe(false);
  });

  it('mensagem anonima tem isAnonymous: true na resposta', () => {
    const anonMessage = {
      id: 'msg-003',
      profileId: 'profile-uuid',
      authorId: 'any-uuid',
      isAnonymous: true,
      isPrivate: false,
      content: 'Mensagem anonima',
      status: 'published' as const,
      createdAt: new Date(),
    };

    const response = service.formatForResponse(anonMessage);
    expect(response.isAnonymous).toBe(true);
  });
});

// ─── postMessage — Approval Flow ────────────────────────────────────────────

describe('MessageService.postMessage — approval flow', () => {
  it('salva como pending quando wall_require_approval = true', async () => {
    const mockQueue = createMockQueue();
    const mockRepo = createMockRepo({
      findUserWithWallSettings: vi.fn().mockResolvedValue({
        id: 'profile-uuid',
        username: 'testuser',
        privacyLevel: 'public',
        wallWhoCanPost: 'authenticated',
        wallAllowAnonymous: true,
        wallRequireApproval: true,
      }),
      create: vi.fn().mockResolvedValue({
        id: 'msg-pending',
        profileId: 'profile-uuid',
        authorId: 'author-uuid',
        isAnonymous: false,
        isPrivate: false,
        content: 'Parabens!',
        status: 'pending',
        createdAt: new Date(),
        deletedAt: null,
      }),
    });
    const service = new MessageService(mockRepo, mockQueue as any);

    const result = await service.postMessage({
      profileId: 'profile-uuid',
      authorId: 'author-uuid',
      content: 'Parabens!',
      type: 'public',
    });

    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    // Notificacao NAO deve ser enfileirada para mensagens pendentes
    expect(mockQueue.add).not.toHaveBeenCalled();
    expect(result.status).toBe('pending');
  });

  it('salva como published e enfileira notificacao quando require_approval = false', async () => {
    const mockQueue = createMockQueue();
    const mockRepo = createMockRepo({
      create: vi.fn().mockResolvedValue({
        id: 'msg-published',
        profileId: 'profile-uuid',
        authorId: 'author-uuid',
        isAnonymous: false,
        isPrivate: false,
        content: 'Parabens!',
        status: 'published',
        createdAt: new Date(),
        deletedAt: null,
      }),
    });
    const service = new MessageService(mockRepo, mockQueue as any);

    await service.postMessage({
      profileId: 'profile-uuid',
      authorId: 'author-uuid',
      content: 'Parabens!',
      type: 'public',
    });

    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'published' }));
    expect(mockQueue.add).toHaveBeenCalledWith(
      'wall.message_posted',
      expect.objectContaining({ type: 'wall.message_posted' })
    );
  });

  it('enfileira notificacao apos aprovacao de mensagem pending', async () => {
    const pendingMsg: WallMessage = {
      id: 'msg-approve',
      profileId: 'profile-uuid',
      authorId: 'author-uuid',
      isAnonymous: false,
      isPrivate: false,
      content: 'Parabens!',
      status: 'pending',
      createdAt: new Date(),
      deletedAt: null,
    };
    const mockQueue = createMockQueue();
    const mockRepo = createMockRepo({
      findById: vi.fn().mockResolvedValue(pendingMsg),
      updateStatus: vi.fn().mockResolvedValue({ ...pendingMsg, status: 'published' }),
    });
    const service = new MessageService(mockRepo, mockQueue as any);

    await service.approveMessage('msg-approve', 'profile-uuid');

    expect(mockQueue.add).toHaveBeenCalledWith(
      'wall.message_posted',
      expect.objectContaining({
        type: 'wall.message_posted',
        messageId: 'msg-approve',
      })
    );
  });
});

// ─── reportMessage — Auto-hide ───────────────────────────────────────────────

describe('MessageService.reportMessage — auto-hide', () => {
  it('muda status para pending quando reports atingem limiar (>= 5)', async () => {
    const publishedMsg: WallMessage = {
      id: 'msg-reports',
      profileId: 'profile-uuid',
      authorId: 'author-uuid',
      isAnonymous: false,
      isPrivate: false,
      content: 'Conteudo reportavel',
      status: 'published',
      createdAt: new Date(),
      deletedAt: null,
    };
    const mockRepo = createMockRepo({
      findById: vi.fn().mockResolvedValue(publishedMsg),
      countReports: vi.fn().mockResolvedValue(5),
      updateStatus: vi.fn().mockResolvedValue({ ...publishedMsg, status: 'pending' }),
    });
    const service = new MessageService(mockRepo, createMockQueue() as any);

    await service.reportMessage('msg-reports', 'reporter-uuid', 'spam');

    expect(mockRepo.updateStatus).toHaveBeenCalledWith('msg-reports', 'pending');
  });

  it('NAO muda status com 4 reports (abaixo do limiar)', async () => {
    const publishedMsg: WallMessage = {
      id: 'msg-few-reports',
      profileId: 'profile-uuid',
      authorId: 'author-uuid',
      isAnonymous: false,
      isPrivate: false,
      content: 'Conteudo normal',
      status: 'published',
      createdAt: new Date(),
      deletedAt: null,
    };
    const mockRepo = createMockRepo({
      findById: vi.fn().mockResolvedValue(publishedMsg),
      countReports: vi.fn().mockResolvedValue(4),
      updateStatus: vi.fn(),
    });
    const service = new MessageService(mockRepo, createMockQueue() as any);

    await service.reportMessage('msg-few-reports', 'reporter-uuid', 'spam');

    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('cria registro de report antes de contar', async () => {
    const publishedMsg: WallMessage = {
      id: 'msg-order',
      profileId: 'profile-uuid',
      authorId: 'author-uuid',
      isAnonymous: false,
      isPrivate: false,
      content: 'Mensagem',
      status: 'published',
      createdAt: new Date(),
      deletedAt: null,
    };
    const createReport = vi.fn().mockResolvedValue(undefined);
    const countReports = vi.fn().mockResolvedValue(3);
    const mockRepo = createMockRepo({
      findById: vi.fn().mockResolvedValue(publishedMsg),
      createReport,
      countReports,
    });
    const service = new MessageService(mockRepo, createMockQueue() as any);

    await service.reportMessage('msg-order', 'reporter-uuid', 'harassment');

    expect(createReport).toHaveBeenCalledWith('msg-order', 'reporter-uuid', 'harassment');
    expect(countReports).toHaveBeenCalled();
  });
});

// ─── postMessage — Validacoes de seguranca ───────────────────────────────────

describe('MessageService.postMessage — validacoes de seguranca', () => {
  it('rejeita mensagem anonima quando wall_allow_anonymous = false', async () => {
    const mockRepo = createMockRepo({
      findUserWithWallSettings: vi.fn().mockResolvedValue({
        id: 'profile-uuid',
        username: 'testuser',
        privacyLevel: 'public',
        wallWhoCanPost: 'authenticated',
        wallAllowAnonymous: false,
        wallRequireApproval: false,
      }),
    });
    const service = new MessageService(mockRepo, createMockQueue() as any);

    await expect(
      service.postMessage({
        profileId: 'profile-uuid',
        authorId: 'author-uuid',
        content: 'Mensagem anonima tentativa',
        type: 'anonymous',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('sanitiza conteudo antes de persistir (nao salva HTML bruto)', async () => {
    const mockQueue = createMockQueue();
    const createMock = vi.fn().mockResolvedValue({
      id: 'msg-sanitized',
      profileId: 'profile-uuid',
      authorId: 'author-uuid',
      isAnonymous: false,
      isPrivate: false,
      content: 'Parabens!',
      status: 'published',
      createdAt: new Date(),
      deletedAt: null,
    });
    const mockRepo = createMockRepo({ create: createMock });
    const service = new MessageService(mockRepo, mockQueue as any);

    await service.postMessage({
      profileId: 'profile-uuid',
      authorId: 'author-uuid',
      content: '<script>alert(1)</script>Parabens!',
      type: 'public',
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Parabens!',
      })
    );
  });

  it('rejeita mensagem com conteudo vazio apos sanitizacao', async () => {
    const mockRepo = createMockRepo();
    const service = new MessageService(mockRepo, createMockQueue() as any);

    await expect(
      service.postMessage({
        profileId: 'profile-uuid',
        authorId: 'author-uuid',
        content: '<script>alert(1)</script>',
        type: 'public',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

// ─── deleteMessage — Authorization ─────────────────────────────────────────

describe('MessageService.deleteMessage — authorization', () => {
  it('permite que o owner do perfil delete qualquer mensagem', async () => {
    const msg: WallMessage = {
      id: 'msg-del',
      profileId: 'owner-uuid',
      authorId: 'author-uuid',
      isAnonymous: false,
      isPrivate: false,
      content: 'Mensagem',
      status: 'published',
      createdAt: new Date(),
      deletedAt: null,
    };
    const mockRepo = createMockRepo({
      findById: vi.fn().mockResolvedValue(msg),
      softDelete: vi.fn().mockResolvedValue(undefined),
    });
    const service = new MessageService(mockRepo, createMockQueue() as any);

    await service.deleteMessage('msg-del', 'owner-uuid');
    expect(mockRepo.softDelete).toHaveBeenCalledWith('msg-del');
  });

  it('impede autor anonimo de deletar a propria mensagem', async () => {
    const anonMsg: WallMessage = {
      id: 'msg-anon-del',
      profileId: 'owner-uuid',
      authorId: 'anon-author-uuid',
      isAnonymous: true,
      isPrivate: false,
      content: 'Mensagem anonima',
      status: 'published',
      createdAt: new Date(),
      deletedAt: null,
    };
    const mockRepo = createMockRepo({
      findById: vi.fn().mockResolvedValue(anonMsg),
    });
    const service = new MessageService(mockRepo, createMockQueue() as any);

    await expect(service.deleteMessage('msg-anon-del', 'anon-author-uuid')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('retorna 404 para mensagem ja deletada', async () => {
    const deletedMsg: WallMessage = {
      id: 'msg-already-deleted',
      profileId: 'owner-uuid',
      authorId: 'author-uuid',
      isAnonymous: false,
      isPrivate: false,
      content: 'Mensagem',
      status: 'published',
      createdAt: new Date(),
      deletedAt: new Date(),
    };
    const mockRepo = createMockRepo({
      findById: vi.fn().mockResolvedValue(deletedMsg),
    });
    const service = new MessageService(mockRepo, createMockQueue() as any);

    await expect(service.deleteMessage('msg-already-deleted', 'owner-uuid')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
