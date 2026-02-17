
import { wsService } from './websocketService';

interface Lock {
  requestId: string;
  userId: string;
  userName: string;
  expiresAt: number;
}

class ConcurrencyService {
  private activeLocks: Map<string, Lock> = new Map();

  // Simula o check de lock no servidor
  checkLock(requestId: string, currentUserId: string): Lock | null {
    const lock = this.activeLocks.get(requestId);
    if (lock && lock.userId !== currentUserId && lock.expiresAt > Date.now()) {
      return lock;
    }
    return null;
  }

  acquireLock(requestId: string, userId: string, userName: string) {
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos
    const lock = { requestId, userId, userName, expiresAt };
    this.activeLocks.set(requestId, lock);

    // Using send instead of emit as per wsService definition
    wsService.send('NOTIFICATION', {
      type: 'NOTIFICATION',
      title: 'Sistema de Trava',
      message: `${userName} iniciou a edição da OS #${requestId.toUpperCase()}.`,
      severity: 'info'
    });
  }

  releaseLock(requestId: string) {
    this.activeLocks.delete(requestId);
  }
}

export const concurrencyService = new ConcurrencyService();
