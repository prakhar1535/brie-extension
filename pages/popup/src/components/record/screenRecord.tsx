import { useCallback, useEffect, useMemo, useState } from 'react';

import { t } from '@extension/i18n';
import { useStorage } from '@extension/shared';
import { recordStateStorage, recordTabStorage, pendingReloadTabsStorage } from '@extension/storage';
import { useUser } from '@extension/store';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  cn,
  Icon,
  Label,
  RadioGroup,
  RadioGroupItem,
} from '@extension/ui';

import { useSlicesCreatedToday } from '@src/hooks';

const recordTypes = [
  {
    name: t('fullPage'),
    slug: 'full-page',
    icon: 'Monitor',
  },
  {
    name: t('viewport'),
    slug: 'viewport',
    icon: 'Square',
  },
  {
    name: t('area'),
    slug: 'area',
    icon: 'Crop',
  },
];

export const ScreenRecord = () => {
  const totalSlicesCreatedToday = useSlicesCreatedToday();
  const user = useUser();
  const recordState = useStorage(recordStateStorage);
  const recordTabId = useStorage(recordTabStorage);
  const pendingReloadTabIds = useStorage(pendingReloadTabsStorage);

  const [activeTab, setActiveTab] = useState<{ id: number | null; url: string }>({ id: null, url: '' });
  const [currentActiveTab, setCurrentActiveTab] = useState<number>();

  const isRecordScreenDisabled = useMemo(
    () => totalSlicesCreatedToday > 10 && user?.fields?.authMethod === 'GUEST',
    [totalSlicesCreatedToday, user?.fields?.authMethod],
  );

  const isRecordActive = useMemo(() => ['recording', 'paused', 'unsaved'].includes(recordState), [recordState]);

  useEffect(() => {
    const initializeState = async () => {
      setActiveTab(prev => ({ ...prev, id: recordTabId }));

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tabs[0]?.url) {
        setActiveTab(prev => ({ ...prev, url: tabs[0].url! }));
        setCurrentActiveTab(tabs[0].id);
      }
    };

    const handleEscapeKey = async (event: KeyboardEvent) => {
      if (event.key === 'Escape' && recordState === 'recording') {
        await updateRecordState('idle');
        await updateActiveTab(null);
      }
    };

    initializeState();
    window.addEventListener('keydown', handleEscapeKey);

    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [recordState, recordTabId]);

  const updateRecordState = useCallback(async (state: 'idle' | 'recording' | 'paused' | 'unsaved') => {
    await recordStateStorage.setRecordState(state);
  }, []);

  const updateActiveTab = useCallback(async (tabId: number | null) => {
    await recordTabStorage.setRecordTabId(tabId);
    setActiveTab(prev => ({ ...prev, id: tabId }));
  }, []);

  const handleScreenRecord = async (type?: 'full-page' | 'viewport' | 'area') => {
    if (recordState === 'unsaved' && activeTab?.id) {
      handleOnDiscard(activeTab.id);
    }

    if (['recording', 'paused', 'unsaved'].includes(recordState)) {
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'STOP_RECORDING' }, response => {
          if (chrome.runtime.lastError) {
            console.error('Error stopping recording:', chrome.runtime.lastError.message);
          } else {
            console.log('Recording stopped:', response);
          }
        });
      }

      await updateRecordState('idle');
      await updateActiveTab(null);

      return;
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tabs[0]?.id && type) {
      await updateRecordState('recording');
      await updateActiveTab(tabs[0].id);

      // TODO: Implement rrweb recording functionality
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: 'START_RECORDING',
          payload: { type },
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error('Error starting recording:', type, chrome.runtime.lastError.message);
          } else {
            console.log('Recording started:', type, response);
          }
        },
      );
    }

    window.close();
  };

  const handlePauseResume = async () => {
    if (recordState === 'recording') {
      await updateRecordState('paused');
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'PAUSE_RECORDING' });
      }
    } else if (recordState === 'paused') {
      await updateRecordState('recording');
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'RESUME_RECORDING' });
      }
    }
  };

  const handleGoToActiveTab = async () => {
    if (activeTab.id) {
      await chrome.tabs.update(activeTab.id, { active: true });
      window.close();
    }
  };

  const handleOnRefreshPendingTab = async () => {
    if (currentActiveTab) {
      await chrome.tabs.reload(currentActiveTab);
      await pendingReloadTabsStorage.remove(currentActiveTab);
    }
  };
  const handleStartReplay = async () => {
    if (activeTab?.id) {
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: 'START_REPLAY', payload: { duration: 30 * 1000 } }, // Last 30 seconds
        response => {
          if (chrome.runtime.lastError) {
            console.error('Error starting replay:', chrome.runtime.lastError.message);
          } else {
            console.log('Replay started:', response);
          }
        },
      );
    }
  };

  const handleOnDiscard = async (activeTabId: number) => {
    await updateRecordState('idle');
    await updateActiveTab(null);

    chrome.tabs.sendMessage(activeTabId, { action: 'DISCARD_RECORDING' }, response => {
      if (chrome.runtime.lastError) {
        console.error('Error discarding recording:', chrome.runtime.lastError.message);
      } else {
        console.log('Recording discarded:', response);
      }
    });
  };

  const isInternalPage = activeTab.url.startsWith('about:') || activeTab.url.startsWith('chrome:');

  if (currentActiveTab && pendingReloadTabIds.includes(currentActiveTab)) {
    return (
      <>
        <Alert className="text-center">
          <AlertDescription className="text-[12px]">
            {t('quickRefresh')} <br />
            {t('readyToGo')}
          </AlertDescription>
        </Alert>

        <div className="mt-4 flex gap-x-2">
          <Button type="button" size="sm" className="w-full" onClick={handleOnRefreshPendingTab}>
            {t('refreshPage')}
          </Button>
        </div>
      </>
    );
  }

  if (isInternalPage && recordState !== 'unsaved' && currentActiveTab !== activeTab.id) {
    return (
      <Alert className="text-center">
        <AlertDescription className="text-[12px]">{t('navigateToWebsite')}</AlertDescription>
      </Alert>
    );
  }

  if (recordState === 'unsaved' && currentActiveTab !== activeTab.id) {
    return (
      <>
        <Alert className="text-center">
          <AlertTitle className="text-[14px]">{t('saveOrDiscardChanges')}</AlertTitle>
          <AlertDescription className="text-[12px]">
            {t('unsavedChanges')} <br /> {t('inAnotherTab')}
          </AlertDescription>
        </Alert>

        <div className="mt-4 flex gap-x-2">
          <Button
            variant="secondary"
            type="button"
            size="sm"
            className="w-full"
            onClick={() => activeTab?.id && handleOnDiscard(activeTab.id)}>
            {t('discard')}
          </Button>
          <Button type="button" size="sm" className="w-full" onClick={handleGoToActiveTab}>
            {t('openActiveTab')}
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <RadioGroup
        className={cn('border-muted grid w-full gap-4 rounded-xl border bg-slate-100/20 p-2', {
          'grid-cols-3': !isRecordActive,
          'grid-cols-1': isRecordActive,
        })}>
        {isRecordActive ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="flex h-3 w-3 animate-pulse rounded-full bg-red-500"></div>
              <span className="text-sm font-medium">
                {recordState === 'recording'
                  ? 'Recording...'
                  : recordState === 'paused'
                    ? 'Paused'
                    : 'Unsaved Recording'}
              </span>
            </div>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={handleStartReplay}>
              <Icon name="Play" size={16} className="mr-1" />
              Replay
            </Button>
            <div className="flex gap-2">
              {recordState === 'recording' && (
                <Button variant="outline" size="sm" className="flex-1" onClick={handlePauseResume}>
                  <Icon name="Pause" size={16} className="mr-1" />
                  Pause
                </Button>
              )}

              {recordState === 'paused' && (
                <Button variant="outline" size="sm" className="flex-1" onClick={handlePauseResume}>
                  <Icon name="Play" size={16} className="mr-1" />
                  Resume
                </Button>
              )}

              <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleScreenRecord()}>
                <Icon name="Square" size={16} className="mr-1" />
                Stop
              </Button>
            </div>
          </div>
        ) : (
          <>
            {recordTypes.map(type => (
              <div key={type.slug}>
                <RadioGroupItem
                  value={type.slug}
                  id={type.slug}
                  className="peer sr-only"
                  onClick={() => handleScreenRecord(type.slug as 'full-page' | 'viewport' | 'area')}
                  disabled={isRecordScreenDisabled}
                />
                <Label
                  htmlFor={type.slug}
                  className={cn(
                    'hover:bg-accent hover:text-accent-foreground flex flex-col items-center justify-between rounded-md border border-transparent py-3 hover:cursor-pointer hover:border-slate-200',
                  )}>
                  <Icon name={type.icon as any} className="mb-3 size-5" strokeWidth={type.slug === 'area' ? 2 : 1.5} />

                  <span className="text-nowrap text-[11px]">{type.name}</span>
                </Label>
              </div>
            ))}
          </>
        )}
      </RadioGroup>

      {activeTab.id !== currentActiveTab && ['recording', 'paused', 'unsaved'].includes(recordState) && (
        <Button type="button" variant="link" size="sm" className="w-full" onClick={handleGoToActiveTab}>
          {t('openActiveTab')}
        </Button>
      )}
    </>
  );
};
