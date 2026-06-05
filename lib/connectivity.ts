import { useEffect, useState } from 'react';

// True active validation ping server to ensure we have a valid backhaul network (not just locally connected to a router)
const ACTIVE_PING_URL = 'https://clients3.google.com/generate_204';

export interface ConnectivityStatus {
  isOnline: boolean;        // Basic navigator state
  hasInternet: boolean;     // Confirmed backhaul through HTTP health probe
  loading: boolean;
}

class NetworkConnectivityService {
  private observers: Set<(status: ConnectivityStatus) => void> = new Set();
  private status: ConnectivityStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    hasInternet: typeof navigator !== 'undefined' ? navigator.onLine : true,
    loading: false
  };
  private checkIntervalId: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleStatusChange(true));
      window.addEventListener('offline', () => this.handleStatusChange(false));
      
      // Start polling for robust health-checks
      this.probeInternetQuietly();
      this.checkIntervalId = setInterval(() => this.probeInternetQuietly(), 30000); // Probe every 30 seconds
    }
  }

  private handleStatusChange(isOnline: boolean) {
    this.status.isOnline = isOnline;
    if (!isOnline) {
      this.status.hasInternet = false;
      this.notifyAll();
    } else {
      this.probeInternetQuietly();
    }
  }

  // Active validation via fetch logic to avoid downstream false-positives
  public async probeInternet(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateStatus(false, false);
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds timeout guard

      const response = await fetch(`${ACTIVE_PING_URL}?t=${Date.now()}`, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);
      const isHealthy = response.type === 'opaque' || response.status === 204;
      this.updateStatus(true, isHealthy);
      return isHealthy;
    } catch (e) {
      console.warn('Conectividade Provedor Ativo falhou:', e);
      this.updateStatus(true, false);
      return false;
    }
  }

  private async probeInternetQuietly() {
    this.status.loading = true;
    this.notifyAll();
    await this.probeInternet();
    this.status.loading = false;
    this.notifyAll();
  }

  private updateStatus(isOnline: boolean, hasInternet: boolean) {
    if (this.status.isOnline !== isOnline || this.status.hasInternet !== hasInternet) {
      this.status.isOnline = isOnline;
      this.status.hasInternet = hasInternet;
      this.notifyAll();
    }
  }

  public subscribe(observer: (status: ConnectivityStatus) => void) {
    this.observers.add(observer);
    observer(this.status);
    return () => {
      this.observers.delete(observer);
    };
  }

  private notifyAll() {
    this.observers.forEach(obs => obs({ ...this.status }));
  }

  public getStatus(): ConnectivityStatus {
    return { ...this.status };
  }

  public dispose() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
    }
  }
}

export const connectivityService = new NetworkConnectivityService();

// Custom high-performance React hook for standard UI wiring
export function useNetworkStatus() {
  const [status, setStatus] = useState<ConnectivityStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    hasInternet: typeof navigator !== 'undefined' ? navigator.onLine : true,
    loading: false
  });

  useEffect(() => {
    const unsubscribe = connectivityService.subscribe((currentStatus) => {
      setStatus(currentStatus);
    });
    return unsubscribe;
  }, []);

  const triggerForceProbe = async () => {
    return await connectivityService.probeInternet();
  };

  return {
    ...status,
    triggerForceProbe
  };
}
