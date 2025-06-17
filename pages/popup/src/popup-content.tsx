import { useEffect, useState } from 'react';

import { useStorage } from '@extension/shared';
import { authTokensStorage, captureStateStorage, userUUIDStorage } from '@extension/storage';
import { useLoginGuestMutation } from '@extension/store';

import { CaptureScreenshotGroup } from './components/capture';
import { ScreenRecord } from './components/record/screenRecord';
import { SlicesHistoryButton, SlicesHistoryContent } from './components/slices-history';
import { Header, BetaNotifier, Skeleton } from './components/ui';

export const PopupContent = () => {
  const captureState = useStorage(captureStateStorage);
  const tokens = useStorage(authTokensStorage);
  const uuid = useStorage(userUUIDStorage);

  const [showSlicesHistory, setShowSlicesHistory] = useState(false);
  const [loginGuest, { isLoading }] = useLoginGuestMutation();
  const [captureType, setCaptureType] = useState<'screenshot' | 'screenRecord'>('screenRecord');
  useEffect(() => {
    const initialGuestLogin = async () => {
      if (!tokens?.accessToken && uuid) {
        loginGuest({ uuid });
      }
    };

    initialGuestLogin();
  }, [loginGuest, tokens?.accessToken, uuid]);

  const handleOnBack = () => setShowSlicesHistory(false);

  if (isLoading) {
    return <Skeleton />;
  }

  return showSlicesHistory ? (
    <SlicesHistoryContent onBack={handleOnBack} />
  ) : (
    <>
      <Header />
      <div className="bg-muted mb-4 flex w-full gap-1 rounded-lg p-1">
        <button
          onClick={() => setCaptureType('screenshot')}
          className={`w-1/2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            captureType === 'screenshot' ? 'bg-white shadow' : 'text-muted-foreground hover:bg-background/50'
          }`}>
          Screenshot
        </button>
        <button
          onClick={() => setCaptureType('screenRecord')}
          className={`w-1/2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            captureType === 'screenRecord' ? 'bg-white shadow' : 'text-muted-foreground hover:bg-background/50'
          }`}>
          Screen Record
        </button>
      </div>
      {captureType === 'screenshot' && <CaptureScreenshotGroup />}
      {captureType === 'screenRecord' && <ScreenRecord />}
      {captureState === 'idle' && <SlicesHistoryButton onClick={() => setShowSlicesHistory(true)} />}
      <BetaNotifier />
    </>
  );
};
