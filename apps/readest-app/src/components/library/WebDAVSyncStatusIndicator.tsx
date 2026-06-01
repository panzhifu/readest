import { useWebDAVSyncStore, WebDAVSyncStatus } from '@/store/webdavSyncStore';
import { useTranslation } from '@/hooks/useTranslation';

const statusConfig: Record<WebDAVSyncStatus, { icon: string; color: string; label: string }> = {
  idle: { icon: '☁️', color: 'text-gray-500', label: 'webdav.status.idle' },
  syncing: { icon: '🔄', color: 'text-blue-500', label: 'webdav.status.syncing' },
  success: { icon: '✅', color: 'text-green-500', label: 'webdav.status.success' },
  error: { icon: '❌', color: 'text-red-500', label: 'webdav.status.error' },
};

export const WebDAVSyncStatusIndicator = () => {
  const _ = useTranslation();
  const { status, progress, currentBook, lastSyncTime, conflictsDetected } = useWebDAVSyncStore();

  const config = statusConfig[status];

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className='flex items-center gap-2 text-sm'>
      <span className={config.color}>{config.icon}</span>
      <span className='text-gray-600'>
        {_(`webdav.status.${status}`)}
        {status === 'syncing' && (
          <span className='ml-2 text-blue-600'>
            {progress}% {currentBook && `- ${currentBook}`}
          </span>
        )}
        {status === 'success' && lastSyncTime && (
          <span className='ml-2 text-gray-400'>
            {_('webdav.status.last_sync')} {formatTime(lastSyncTime)}
          </span>
        )}
        {conflictsDetected > 0 && (
          <span className='ml-2 text-orange-500'>
            {_('webdav.status.conflicts', { count: conflictsDetected })}
          </span>
        )}
      </span>
    </div>
  );
};
