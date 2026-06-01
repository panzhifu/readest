import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import { MdChevronRight } from 'react-icons/md';
import { RiCloudLine, RiRssLine } from 'react-icons/ri';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { useWebDAVSyncStore } from '@/store/webdavSyncStore';
import WebDAVForm from './integrations/WebDAVForm';
import { SectionTitle, SettingLabel } from './primitives';

type SubPage = 'webdav' | null;

const IntegrationsPanel: React.FC = () => {
  const _ = useTranslation();
  const { settings } = useSettingsStore();
  const isWebDAVSyncing = useWebDAVSyncStore((s) => s.isSyncing);
  const [subPage, setSubPage] = useState<SubPage>(null);

  if (subPage === 'webdav')
    return (
      <div className='my-4 w-full'>
        <WebDAVForm onBack={() => setSubPage(null)} />
      </div>
    );

  const webdavStatus = isWebDAVSyncing
    ? _('Syncing…')
    : settings.webdav?.enabled
      ? _('Connected')
      : _('Not connected');

  return (
    <div className='my-4 w-full space-y-6'>
      <div className='w-full px-4'>
        <h2 className='mb-1.5 text-lg font-semibold tracking-tight'>{_('Integrations')}</h2>
        <p className='text-base-content/70 text-sm leading-relaxed'>
          {_('Sync your reading progress and books via WebDAV.')}
        </p>
      </div>

      <div className='w-full'>
        <SectionTitle className='mb-2'>{_('Sync')}</SectionTitle>
        <div className='card eink-bordered border-base-200 bg-base-100 overflow-hidden border'>
          <div className='divide-base-200 divide-y'>
            <IntegrationRow
              icon={RiCloudLine}
              title='WebDAV'
              status={webdavStatus}
              onClick={() => setSubPage('webdav')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const IntegrationRow: React.FC<{
  icon: React.ElementType;
  title: string;
  status: string;
  onClick: () => void;
}> = ({ icon: Icon, title, status, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className={clsx(
      'group flex w-full items-center gap-3 px-4 py-3 text-left',
      'transition-colors duration-150',
      'focus-visible:ring-base-content/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
    )}
  >
    <span
      className={clsx(
        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
        'bg-base-200 text-base-content/70',
        'transition-colors duration-150',
        'group-hover:bg-base-300/70',
      )}
    >
      <Icon className='h-5 w-5' />
    </span>
    <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
      <SettingLabel>{title}</SettingLabel>
      <span className='text-base-content/65 truncate text-[0.85em]'>{status}</span>
    </div>
    <MdChevronRight className='text-base-content/50 h-5 w-5 flex-shrink-0' />
  </button>
);

export default IntegrationsPanel;
