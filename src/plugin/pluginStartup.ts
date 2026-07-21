export interface PluginStartupRegistration {
  name: string;
  register(): void;
}

export interface PluginStartupOptions {
  startBootstrap(): Promise<void>;
  registrations: PluginStartupRegistration[];
  publishReady?: (ready: Promise<void>) => void;
  onRegistrationStart?: (name: string) => void;
  onRegistrationComplete?: (name: string) => void;
  onRegistrationError(name: string, error: unknown): void;
}

/**
 * Start persistent data loading first, then isolate host-surface registration.
 * A broken optional surface must never leave the repository in an unloaded
 * state while exposing an already-resolved readiness promise.
 */
export function initializePluginStartup(options: PluginStartupOptions): Promise<void> {
  const ready = options.startBootstrap();
  options.publishReady?.(ready);
  for (const step of options.registrations) {
    try {
      options.onRegistrationStart?.(step.name);
      step.register();
      options.onRegistrationComplete?.(step.name);
    } catch (error) {
      options.onRegistrationError(step.name, error);
    }
  }
  return ready;
}
