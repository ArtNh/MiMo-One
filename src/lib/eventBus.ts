type EventCallback = (...args: any[]) => void;

class EventBus {
  private events: { [key: string]: EventCallback[] } = {};

  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventCallback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(...args));
  }
}

// 强制挂载在 window 上以确保在不同的 Vite 打包编译别名中始终共享同一个单例
if (!(window as any).globalEventBus) {
  (window as any).globalEventBus = new EventBus();
}

export const eventBus: EventBus = (window as any).globalEventBus;
