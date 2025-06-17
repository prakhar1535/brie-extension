import { useEffect, useState } from 'react';

import { annotationsRedoStorage, annotationsStorage, captureStateStorage } from '@extension/storage';
import { store, ReduxProvider } from '@extension/store';
import { Toaster, TooltipProvider } from '@extension/ui';

import { RecordingReplayModal } from './components/recording/recording-replay.modal';
import Content from './content';

export default function App() {
  const [replayData, setReplayData] = useState<any[]>([]);
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [screenshots, setScreenshots] = useState<{ name: string; image: string }[]>();

  useEffect(() => {
    const handleDisplayModal = async event => {
      setScreenshots(event.detail.screenshots); // Extract data from the event
      await captureStateStorage.setCaptureState('unsaved');
    };

    const handleStartReplay = async event => {
      setReplayData(event.detail.events);
      setShowReplayModal(true);
    };

    // Attach event listener
    window.addEventListener('DISPLAY_MODAL', handleDisplayModal);
    window.addEventListener('CLOSE_MODAL', handleOnCloseModal);
    window.addEventListener('START_REPLAY', handleStartReplay);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('DISPLAY_MODAL', handleDisplayModal);
      window.removeEventListener('CLOSE_MODAL', handleOnCloseModal);
      window.removeEventListener('START_REPLAY', handleStartReplay);
    };
  }, []);

  const handleOnCloseModal = async () => {
    setScreenshots(null);

    await captureStateStorage.setCaptureState('idle');

    annotationsStorage.setAnnotations([]);
    annotationsRedoStorage.setAnnotations([]);
  };

  // if (!screenshots?.length) return null;

  return (
    <ReduxProvider store={store}>
      <TooltipProvider>
        <div className="light relative">
          {screenshots?.length && (
            <main className="flex-1 md:container md:max-w-screen-xl">
              <div className="flex items-center justify-between gap-2 rounded bg-white">
                <Content onClose={handleOnCloseModal} screenshots={screenshots} />
              </div>
            </main>
          )}

          {showReplayModal && (
            <RecordingReplayModal
              events={replayData}
              onClose={() => setShowReplayModal(false)}
              isVisible={showReplayModal}
            />
          )}

          <Toaster richColors />
        </div>
      </TooltipProvider>
    </ReduxProvider>
  );
}
