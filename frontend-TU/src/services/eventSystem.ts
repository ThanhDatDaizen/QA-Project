/**
 * eventSystem.ts - Event logger for UI/Terminal sync
 * Logs all UI actions to Terminal and vice versa + Data refresh triggers
 */

type EventListener = (message: string) => void;
type DataRefreshListener = (type: 'ideas' | 'users' | 'stats' | 'all') => void;

export class EventSystem {
  private static listeners: EventListener[] = [];
  private static refreshListeners: DataRefreshListener[] = [];

  // Subscribe to events
  static subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Subscribe to data refresh events
  static subscribeToRefresh(listener: DataRefreshListener): () => void {
    this.refreshListeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.refreshListeners = this.refreshListeners.filter((l) => l !== listener);
    };
  }

  // Emit event to all listeners
  static emit(message: string): void {
    this.listeners.forEach((listener) => listener(message));
  }

  // Trigger data refresh in Dashboard
  static triggerRefresh(type: 'ideas' | 'users' | 'stats' | 'all' = 'all'): void {
    console.log(`[EventSystem] 🔄 Triggering refresh for: ${type}`);
    this.refreshListeners.forEach((listener) => listener(type));
  }

  // Log UI action
  static logUIAction(action: string, details: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const message = `[${timestamp}] 🖱️ UI ACTION: ${action} - ${details}`;
    this.emit(message);
  }

  // Log command execution
  static logCommand(command: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const message = `[${timestamp}] ⌨️ COMMAND: ${command}`;
    this.emit(message);
  }

  // Log system action
  static logSystem(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const fullMessage = `[${timestamp}] ⚙️ SYSTEM: ${message}`;
    this.emit(fullMessage);
  }

  // Log success
  static logSuccess(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const fullMessage = `[${timestamp}] ✅ SUCCESS: ${message}`;
    this.emit(fullMessage);
  }

  // Log error
  static logError(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const fullMessage = `[${timestamp}] ❌ ERROR: ${message}`;
    this.emit(fullMessage);
  }

  // Log command result and trigger refresh
  static commandExecuted(commandType: 'ideas' | 'users' | 'stats' | 'delete' | 'power' | 'help' | 'error'): void {
    // Trigger refresh based on command type
    if (commandType === 'ideas' || commandType === 'stats') {
      this.triggerRefresh('all');
    } else if (commandType === 'delete') {
      this.triggerRefresh('ideas');
    } else if (commandType === 'power') {
      this.triggerRefresh('users');
    }
  }
}

export default EventSystem;
