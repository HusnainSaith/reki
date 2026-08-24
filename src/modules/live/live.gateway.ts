import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/live',
  transports: ['websocket', 'polling'],
})
export class LiveGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveGateway.name);

  // Track connected users and their rooms
  private connectedUsers = new Map<string, Set<string>>(); // userId → Set<socketId>
  private socketToUser = new Map<string, string>(); // socketId → userId

  // Track "currently viewing" per venue
  private venueViewers = new Map<string, Set<string>>(); // venueId → Set<socketId>

  afterInit() {
    this.logger.log('WebSocket Gateway initialized on /live');
  }

  handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.query?.token as string) ||
        client.handshake.auth?.token;

      if (!token) {
        this.logger.warn(`WebSocket connection without token: ${client.id}`);
        client.disconnect();
        return;
      }

      const secret = process.env.JWT_SECRET || 'reki-dev-jwt-secret-2024';
      const decoded = jwt.verify(token, secret) as any;
      const userId = decoded.sub;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Track connection
      this.socketToUser.set(client.id, userId);
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId).add(client.id);

      // Auto-join user's personal room
      client.join(`user:${userId}`);

      this.logger.log(
        `Client connected: ${client.id} (user: ${userId}) — ` +
        `total connections: ${this.socketToUser.size}`,
      );
    } catch {
      this.logger.warn(`WebSocket auth failed: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.connectedUsers.get(userId)?.delete(client.id);
      if (this.connectedUsers.get(userId)?.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
    this.socketToUser.delete(client.id);

    // Remove from all venue viewer sets
    for (const [venueId, viewers] of this.venueViewers) {
      if (viewers.has(client.id)) {
        viewers.delete(client.id);
        // Broadcast updated count
        this.server.to(`venue:${venueId}`).emit('VIEWING_COUNT', {
          venueId,
          count: viewers.size,
        });
        if (viewers.size === 0) {
          this.venueViewers.delete(venueId);
        }
      }
    }

    this.logger.debug(`Client disconnected: ${client.id} — total: ${this.socketToUser.size}`);
  }

  // ─── ROOM SUBSCRIPTION ─────────────────────────────

  @SubscribeMessage('join:city')
  handleJoinCity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { city: string },
  ) {
    const room = `city:${data.city}`;
    client.join(room);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave:city')
  handleLeaveCity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { city: string },
  ) {
    client.leave(`city:${data.city}`);
  }

  @SubscribeMessage('join:venue')
  handleJoinVenue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { venueId: string },
  ) {
    const room = `venue:${data.venueId}`;
    client.join(room);

    // Track viewer
    if (!this.venueViewers.has(data.venueId)) {
      this.venueViewers.set(data.venueId, new Set());
    }
    this.venueViewers.get(data.venueId).add(client.id);

    // Broadcast updated count
    const count = this.venueViewers.get(data.venueId).size;
    this.server.to(room).emit('VIEWING_COUNT', { venueId: data.venueId, count });

    return { event: 'joined', room, currentlyViewing: count };
  }

  @SubscribeMessage('leave:venue')
  handleLeaveVenue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { venueId: string },
  ) {
    client.leave(`venue:${data.venueId}`);

    // Remove viewer
    const viewers = this.venueViewers.get(data.venueId);
    if (viewers) {
      viewers.delete(client.id);
      const count = viewers.size;
      this.server.to(`venue:${data.venueId}`).emit('VIEWING_COUNT', {
        venueId: data.venueId,
        count,
      });
      if (count === 0) {
        this.venueViewers.delete(data.venueId);
      }
    }
  }

  @SubscribeMessage('join:map')
  handleJoinMap(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { city: string },
  ) {
    const room = `map:${data.city}`;
    client.join(room);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave:map')
  handleLeaveMap(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { city: string },
  ) {
    client.leave(`map:${data.city}`);
  }

  @SubscribeMessage('join:business')
  handleJoinBusiness(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { venueId: string },
  ) {
    const room = `business:${data.venueId}`;
    client.join(room);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave:business')
  handleLeaveBusiness(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { venueId: string },
  ) {
    client.leave(`business:${data.venueId}`);
  }

  // ─── BROADCAST METHODS (called by services) ─────────

  /**
   * Broadcast busyness update to city feed, venue detail, and map.
   */
  broadcastBusynessUpdate(
    city: string,
    venueId: string,
    data: {
      level: string;
      percentage: number;
      ragColor: string;
      vibeTags?: string[];
      vibeLabel?: string;
    },
  ) {
    // City feed
    this.server.to(`city:${city}`).emit('BUSYNESS_UPDATE', { venueId, busyness: data });

    // Venue detail
    this.server.to(`venue:${venueId}`).emit('BUSYNESS_LIVE', {
      percentage: data.percentage,
      level: data.level,
      ragColor: data.ragColor,
    });

    // Map markers
    this.server.to(`map:${city}`).emit('MARKER_UPDATE', {
      venueId,
      ragColor: data.ragColor,
      busynessPercentage: data.percentage,
      vibeLabel: data.vibeLabel,
    });

    // Business dashboard
    this.server.to(`business:${venueId}`).emit('STATS_UPDATE', {
      busyness: data.percentage,
      ragColor: data.ragColor,
    });
  }

  /**
   * Broadcast vibe update to venue detail viewers.
   */
  broadcastVibeUpdate(venueId: string, tags: string[]) {
    this.server.to(`venue:${venueId}`).emit('VIBE_UPDATE', { tags });
  }

  /**
   * Broadcast new offer to city feed.
   */
  broadcastNewOffer(
    city: string,
    venueId: string,
    data: { venueName: string; title: string; endsIn?: string },
  ) {
    this.server.to(`city:${city}`).emit('NEW_OFFER', { venueId, ...data });
  }

  /**
   * Broadcast offer countdown to venue viewers.
   */
  broadcastOfferCountdown(
    venueId: string,
    data: { offerId: string; remainingMinutes: number; isUrgent: boolean },
  ) {
    this.server.to(`venue:${venueId}`).emit('OFFER_COUNTDOWN', data);
  }

  /**
   * Broadcast offer expired to venue viewers.
   */
  broadcastOfferExpired(venueId: string, offerId: string) {
    this.server.to(`venue:${venueId}`).emit('OFFER_EXPIRED', { offerId });
  }

  /**
   * Broadcast new redemption to business dashboard.
   */
  broadcastNewRedemption(
    venueId: string,
    data: { offerId: string; offerTitle: string; count: number },
  ) {
    this.server.to(`business:${venueId}`).emit('NEW_REDEMPTION', data);
  }

  /**
   * Broadcast new save to business dashboard.
   */
  broadcastNewSave(venueId: string, totalSaves: number) {
    this.server.to(`business:${venueId}`).emit('NEW_SAVE', { totalSaves });
  }

  /**
   * Broadcast social update to venue viewers.
   */
  broadcastSocialUpdate(
    venueId: string,
    data: { count: number; message: string },
  ) {
    this.server.to(`venue:${venueId}`).emit('SOCIAL_UPDATE', data);
  }

  /**
   * Send to a specific user's personal room.
   */
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ─── STATS ──────────────────────────────────────────

  getConnectionStats(): {
    activeConnections: number;
    uniqueUsers: number;
    venueViewers: Record<string, number>;
  } {
    const venueViewerCounts: Record<string, number> = {};
    for (const [venueId, viewers] of this.venueViewers) {
      venueViewerCounts[venueId] = viewers.size;
    }

    return {
      activeConnections: this.socketToUser.size,
      uniqueUsers: this.connectedUsers.size,
      venueViewers: venueViewerCounts,
    };
  }

  getVenueViewerCount(venueId: string): number {
    return this.venueViewers.get(venueId)?.size || 0;
  }
}
