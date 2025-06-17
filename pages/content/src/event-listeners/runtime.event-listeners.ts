import { recordingEventsStorage } from '@extension/storage/lib/impl/recording-events.storage';

import { cleanup, startScreenshotCapture } from '@src/capture';
import { ScreenRecordManager } from '@src/screen-record.manager';

const recordManager = new ScreenRecordManager();
export const addRuntimeEventListeners = () => {
  chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.action === 'START_SCREENSHOT') {
      window.dispatchEvent(new CustomEvent('metadata'));

      startScreenshotCapture(msg.payload);
    }

    if (msg.action === 'EXIT_CAPTURE') {
      cleanup();
    }

    if (msg.action === 'CLOSE_MODAL') {
      window.dispatchEvent(new CustomEvent('CLOSE_MODAL'));
    }
    if (msg.action === 'START_RECORDING') {
      const result = await recordManager.startRecording(msg.payload.type);
      sendResponse(result);
      return;
    }

    if (msg.action === 'STOP_RECORDING') {
      const result = recordManager.stopRecording();
      sendResponse(result);
      return;
    }

    if (msg.action === 'PAUSE_RECORDING') {
      const result = recordManager.pauseRecording();
      sendResponse(result);
      return;
    }

    if (msg.action === 'RESUME_RECORDING') {
      const result = recordManager.resumeRecording();
      sendResponse(result);
      return;
    }

    if (msg.action === 'GET_RECORDING_DATA') {
      const data = await recordManager.getRecordingData();
      sendResponse(data);
      return;
    }
    if (msg.action === 'START_REPLAY') {
      const duration = msg.payload?.duration || 5 * 1000;
      const events = await recordManager.getReplayData(duration);
      window.dispatchEvent(
        new CustomEvent('START_REPLAY', {
          detail: { events },
        }),
      );

      sendResponse({ success: true, eventsCount: events.length });
      return;
    }

    if (msg.action === 'DISCARD_RECORDING') {
      recordManager.stopRecording();
      await recordingEventsStorage.clearEvents();
      sendResponse({ success: true });
      return;
    }
  });
};
