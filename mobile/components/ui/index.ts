// UI Components exports
export { default as Button } from './Button';
export type { ButtonProps } from './Button';

export { default as Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';

export { 
  default as StatusIndicator,
  OnlineIndicator,
  OfflineIndicator,
  LastSeenIndicator,
} from './StatusIndicator';
export type { StatusIndicatorProps } from './StatusIndicator';

export { default as ConnectionStatusIndicator } from './ConnectionStatusIndicator';
export type { ConnectionStatusIndicatorProps } from './ConnectionStatusIndicator';

// Alias for backward compatibility
export { ConnectionStatusIndicator as ConnectionStatus } from './ConnectionStatusIndicator';
