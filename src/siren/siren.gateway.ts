import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SirenGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('SirenGateway');

  afterInit() {
    this.logger.log('🔌 Siren WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('trigger_siren')
  handleTriggerSiren(
    @MessageBody() data: { timestamp?: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.warn(
      `🚨 SIREN TRIGGERED by ${client.id} at ${data?.timestamp ?? new Date().toISOString()}`,
    );

    // Broadcast to ALL connected clients (including Python AI)
    this.server.emit('trigger_siren', {
      triggered_by: client.id,
      timestamp: data?.timestamp ?? new Date().toISOString(),
    });

    return { event: 'siren_ack', data: { status: 'siren_triggered' } };
  }
}
