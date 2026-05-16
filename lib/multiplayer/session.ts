const ROOM_SESSION_PREFIX = 'checkers-room-session-';

export interface RoomSession {
  roomId: string;
  role: 'host' | 'guest';
  playerToken: string;
  playerName: string;
}

export function createPlayerToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function saveRoomSession(session: RoomSession): void {
  localStorage.setItem(
    `${ROOM_SESSION_PREFIX}${session.roomId}`,
    JSON.stringify(session)
  );
}

export function loadRoomSession(roomId: string): RoomSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${ROOM_SESSION_PREFIX}${roomId}`);
    return raw ? (JSON.parse(raw) as RoomSession) : null;
  } catch {
    return null;
  }
}

export function clearRoomSession(roomId: string): void {
  localStorage.removeItem(`${ROOM_SESSION_PREFIX}${roomId}`);
}

export function getDefaultPlayerName(): string {
  // Проверяем, доступен ли window (то есть выполняемся ли мы в браузере)
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('checkers-player-name');
    if (saved) return saved;
  }
  
  return `Игрок-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function saveDefaultPlayerName(name: string): void {
  localStorage.setItem('checkers-player-name', name);
}
