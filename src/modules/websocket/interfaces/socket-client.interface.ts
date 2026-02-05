import { Socket } from 'socket.io';

/**
 * Cliente de WebSocket extendido con datos de usuario
 */
export interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail?: string;
  userRoles?: string[];
}

/**
 * Datos de conexión de un socket
 */
export interface SocketConnection {
  socketId: string;
  userId: string;
  connectedAt: Date;
  userAgent?: string;
  ipAddress?: string;
  namespace?: string;
}

/**
 * Metadatos de conexión
 */
export interface ConnectionMeta {
  userAgent?: string;
  ip?: string;
  namespace?: string;
}

/**
 * Payload de notificación para enviar por WebSocket
 */
export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  createdAt: Date;
  readAt?: Date | null;
}

/**
 * Payload de mensaje para enviar por WebSocket
 */
export interface MessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  content: string;
  type: string;
  attachmentUrl?: string;
  attachmentType?: string;
  createdAt: Date;
  editedAt?: Date | null;
}

/**
 * Evento de typing indicator
 */
export interface TypingEvent {
  conversationId: string;
  userId: string;
  userName?: string;
  isTyping: boolean;
}

/**
 * Evento de lectura de mensajes
 */
export interface MessageReadEvent {
  conversationId: string;
  messageIds: string[];
  readBy: string;
  readAt: Date;
}

/**
 * Evento de presencia (online/offline)
 */
export interface PresenceEvent {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
}

/**
 * Respuesta genérica de WebSocket
 */
export interface WsResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Eventos del servidor (emitidos por el servidor)
 */
export interface ServerToClientEvents {
  // Conexión
  connected: (data: { userId: string; socketId: string }) => void;
  error: (data: { code: string; message: string }) => void;

  // Notificaciones
  notification: (payload: NotificationPayload) => void;
  'notification:broadcast': (payload: NotificationPayload) => void;
  'notification:role': (payload: NotificationPayload) => void;

  // Mensajería
  'message:new': (payload: MessagePayload) => void;
  'message:typing': (event: TypingEvent) => void;
  'message:read:ack': (event: MessageReadEvent) => void;
  'message:edited': (payload: MessagePayload) => void;
  'message:deleted': (data: { messageId: string; conversationId: string }) => void;

  // Presencia
  'presence:update': (event: PresenceEvent) => void;
}

/**
 * Eventos del cliente (recibidos del cliente)
 */
export interface ClientToServerEvents {
  // Notificaciones
  'notification:read': (
    data: { notificationId: string },
    callback: (response: WsResponse) => void,
  ) => void;
  'notifications:unread': (callback: (response: WsResponse<NotificationPayload[]>) => void) => void;

  // Mensajería
  'conversation:join': (
    data: { conversationId: string },
    callback: (response: WsResponse) => void,
  ) => void;
  'conversation:leave': (
    data: { conversationId: string },
    callback: (response: WsResponse) => void,
  ) => void;
  'message:send': (
    data: { conversationId: string; content: string; type?: string },
    callback: (response: WsResponse<MessagePayload>) => void,
  ) => void;
  'message:typing': (data: { conversationId: string; isTyping: boolean }) => void;
  'message:read': (
    data: { conversationId: string; messageIds: string[] },
    callback: (response: WsResponse) => void,
  ) => void;
}
