import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnomalyDetectionService } from '../anomaly-detection.service.js';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;
  let redisMock: { incr: ReturnType<typeof vi.fn>; expire: ReturnType<typeof vi.fn> };
  let auditMock: { insert: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    redisMock = {
      incr: vi.fn(),
      expire: vi.fn().mockResolvedValue(1),
    };
    auditMock = { insert: vi.fn().mockResolvedValue(undefined) };
    service = new AnomalyDetectionService(redisMock as any, auditMock as any);
  });

  // ─── checkLoginFlood (IP) ────────────────────────────────────────────────────

  describe('checkLoginFlood (IP)', () => {
    it('nao lanca erro quando abaixo do threshold (20)', async () => {
      redisMock.incr.mockResolvedValue(15);
      await expect(service.checkLoginFlood('1.2.3.4')).resolves.not.toThrow();
      expect(auditMock.insert).not.toHaveBeenCalled();
    });

    it('lanca TooManyRequestsError e loga anomalia quando count > 20', async () => {
      redisMock.incr.mockResolvedValue(21);
      await expect(service.checkLoginFlood('1.2.3.4')).rejects.toThrow('Login flood');
      expect(auditMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'anomaly.login_flood', ipAddress: '1.2.3.4' }),
      );
    });

    it('usa chave Redis com formato anomaly:login:ip:{ip}', async () => {
      redisMock.incr.mockResolvedValue(1);
      await service.checkLoginFlood('10.0.0.1');
      expect(redisMock.incr).toHaveBeenCalledWith('anomaly:login:ip:10.0.0.1');
    });

    it('define expire de 3600 segundos (1 hora)', async () => {
      redisMock.incr.mockResolvedValue(1);
      await service.checkLoginFlood('1.2.3.4');
      expect(redisMock.expire).toHaveBeenCalledWith('anomaly:login:ip:1.2.3.4', 3600);
    });

    it('nao lanca erro quando count = 20 (limite exato)', async () => {
      redisMock.incr.mockResolvedValue(20);
      await expect(service.checkLoginFlood('1.2.3.4')).resolves.not.toThrow();
    });
  });

  // ─── checkMessageFlood ───────────────────────────────────────────────────────

  describe('checkMessageFlood', () => {
    it('lanca erro e loga anomalia quando count > 50', async () => {
      redisMock.incr.mockResolvedValue(51);
      await expect(service.checkMessageFlood('user-123')).rejects.toThrow();
      expect(auditMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'anomaly.message_flood', actorId: 'user-123' }),
      );
    });

    it('nao lanca erro quando count = 50 (limite exato)', async () => {
      redisMock.incr.mockResolvedValue(50);
      await expect(service.checkMessageFlood('user-123')).resolves.not.toThrow();
    });

    it('usa chave Redis com formato anomaly:message:user:{userId}', async () => {
      redisMock.incr.mockResolvedValue(1);
      await service.checkMessageFlood('user-abc');
      expect(redisMock.incr).toHaveBeenCalledWith('anomaly:message:user:user-abc');
    });
  });

  // ─── checkFriendshipFlood ─────────────────────────────────────────────────────

  describe('checkFriendshipFlood', () => {
    it('lanca erro e loga anomalia quando count > 30', async () => {
      redisMock.incr.mockResolvedValue(31);
      await expect(service.checkFriendshipFlood('user-456')).rejects.toThrow();
      expect(auditMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'anomaly.friendship_flood' }),
      );
    });

    it('nao lanca erro quando count = 30 (limite exato)', async () => {
      redisMock.incr.mockResolvedValue(30);
      await expect(service.checkFriendshipFlood('user-456')).resolves.not.toThrow();
    });
  });

  // ─── checkResetFlood ─────────────────────────────────────────────────────────

  describe('checkResetFlood', () => {
    it('retorna false (nao bloquear) quando abaixo do threshold (5)', async () => {
      redisMock.incr.mockResolvedValue(3);
      const result = await service.checkResetFlood('1.2.3.4');
      expect(result).toBe(false);
      expect(auditMock.insert).not.toHaveBeenCalled();
    });

    it('retorna true e loga anomalia quando count > 5 (silencioso — sem excecao)', async () => {
      redisMock.incr.mockResolvedValue(6);
      const result = await service.checkResetFlood('1.2.3.4');
      expect(result).toBe(true); // silencioso
      expect(auditMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'anomaly.reset_flood' }),
      );
    });

    it('NAO lanca excecao (ataque silencioso)', async () => {
      redisMock.incr.mockResolvedValue(100);
      await expect(service.checkResetFlood('1.2.3.4')).resolves.not.toThrow();
    });

    it('usa chave Redis com formato anomaly:reset:ip:{ip}', async () => {
      redisMock.incr.mockResolvedValue(1);
      await service.checkResetFlood('5.5.5.5');
      expect(redisMock.incr).toHaveBeenCalledWith('anomaly:reset:ip:5.5.5.5');
    });
  });

  // ─── checkLoginFloodByEmail ──────────────────────────────────────────────────

  describe('checkLoginFloodByEmail', () => {
    it('registra anomalia quando count > 10, mas nao lanca erro', async () => {
      redisMock.incr.mockResolvedValue(11);
      await expect(service.checkLoginFloodByEmail('bad@test.com')).resolves.not.toThrow();
      expect(auditMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'anomaly.login_flood_email' }),
      );
    });

    it('usa TTL de 900 segundos (15 minutos)', async () => {
      redisMock.incr.mockResolvedValue(1);
      await service.checkLoginFloodByEmail('test@test.com');
      expect(redisMock.expire).toHaveBeenCalledWith(
        expect.stringContaining('anomaly:login:email:'),
        900,
      );
    });
  });
});
