import { socketService } from './socketService.js';
// Importa tu modelo de campañas o el servicio de acceso a datos

interface CampaignTimer {
  campaignId: string;
  endTime: Date;
  interval: NodeJS.Timeout;
}

class CampaignTimerService {
  private activeTimers: Map<string, CampaignTimer> = new Map();

  // Iniciar temporizador para una campaña
  startCampaignTimer(campaignId: string, durationMinutes: number): void {
    // Si ya hay un temporizador activo para esta campaña, detenerlo
    if (this.activeTimers.has(campaignId)) {
      this.stopCampaignTimer(campaignId);
    }

    // Calcular tiempo de finalización
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + durationMinutes);

    // Crear intervalo para actualizar cada segundo
    const interval = setInterval(() => {
      this.updateCampaignTime(campaignId, endTime);
    }, 1000);

    // Guardar en la colección de temporizadores activos
    this.activeTimers.set(campaignId, {
      campaignId,
      endTime,
      interval
    });

    console.log(`Campaign timer started for campaign ${campaignId}. Duration: ${durationMinutes} minutes.`);
  }

  // Detener temporizador de campaña
  stopCampaignTimer(campaignId: string): void {
    const timer = this.activeTimers.get(campaignId);
    if (timer) {
      clearInterval(timer.interval);
      this.activeTimers.delete(campaignId);
      console.log(`Campaign timer stopped for campaign ${campaignId}`);
    }
  }

  // Actualizar tiempo de campaña y emitir a clientes
  private async updateCampaignTime(campaignId: string, endTime: Date): Promise<void> {
    const now = new Date();
    const remainingMilliseconds = endTime.getTime() - now.getTime();

    // Si el tiempo ha expirado, desactivar la campaña
    if (remainingMilliseconds <= 0) {
      this.stopCampaignTimer(campaignId);
      await this.deactivateCampaign(campaignId);
      socketService.emitCampaignStatusChange(campaignId, false);
      socketService.emitTimeUpdate(campaignId, 0);
      return;
    }

    // Enviar actualización a los clientes
    socketService.emitTimeUpdate(campaignId, Math.floor(remainingMilliseconds / 1000));
  }

  // Desactivar campaña cuando expira el tiempo
  private async deactivateCampaign(campaignId: string): Promise<void> {
    try {
      // Aquí debes implementar la lógica para desactivar la campaña en tu base de datos
      // Por ejemplo:
      // await campaignRepository.update(campaignId, { isActive: false });
      console.log(`Campaign ${campaignId} deactivated due to time expiration`);
    } catch (error) {
      console.error(`Error deactivating campaign ${campaignId}:`, error);
    }
  }
}

export const campaignTimerService = new CampaignTimerService();