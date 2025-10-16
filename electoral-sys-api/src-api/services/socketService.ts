import { Server as SocketIOServer } from 'socket.io';

class SocketService {
  private io: SocketIOServer | null = null;

  // Inicializa el servicio con la instancia de Socket.IO
  initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupEventHandlers();
  }

  // Configura los manejadores de eventos
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: any) => {
      console.log(`Socket connected: ${socket.id}, User: ${socket.user.numeroColegiado}`);

      // Unirse a sala de una campaña específica
      socket.on('joinCampaign', (campaignId: string) => {
        const room = `campaign:${campaignId}`;
        socket.join(room);
        socket.campaignRooms.push(room);
        console.log(`User ${socket.user.numeroColegiado} joined campaign ${campaignId}`);
      });

      // Dejar la sala de una campaña
      socket.on('leaveCampaign', (campaignId: string) => {
        const room = `campaign:${campaignId}`;
        socket.leave(room);
        socket.campaignRooms = socket.campaignRooms.filter((r: string) => r !== room);
        console.log(`User ${socket.user.numeroColegiado} left campaign ${campaignId}`);
      });

      // Manejar la desconexión
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  // Emitir actualización de votos a todos los clientes en la sala de una campaña
  emitVoteUpdate(campaignId: string, voteData: any): void {
    if (!this.io) return;
    
    this.io.to(`campaign:${campaignId}`).emit('voteUpdate', {
      campaignId,
      ...voteData
    });
  }

  // Emitir actualización del estado de la campaña (habilitada/deshabilitada)
  emitCampaignStatusChange(campaignId: string, isActive: boolean): void {
    if (!this.io) return;
    
    this.io.to(`campaign:${campaignId}`).emit('campaignStatusChange', {
      campaignId,
      isActive
    });
  }

  // Emitir actualización del tiempo restante de la campaña
  emitTimeUpdate(campaignId: string, remainingTime: number): void {
    if (!this.io) return;
    
    this.io.to(`campaign:${campaignId}`).emit('timeUpdate', {
      campaignId,
      remainingTime
    });
  }
}

export const socketService = new SocketService();