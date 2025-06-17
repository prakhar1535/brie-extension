import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type RecordingEventsStorage = BaseStorage<RecordingEvent[]> & {
  addEvent: (event: RecordingEvent) => Promise<void>;
  getEvents: () => Promise<RecordingEvent[]>;
  clearEvents: () => Promise<void>;
  getRecentEvents: (duration: number) => Promise<RecordingEvent[]>;
  setEvents: (events: RecordingEvent[]) => Promise<void>;
};

const storage = createStorage<RecordingEvent[]>('recording-events-storage-key', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const recordingEventsStorage: RecordingEventsStorage = {
  ...storage,

  addEvent: async (event: RecordingEvent) => {
    const events = await storage.get();
    const BUFFER_DURATION = 2 * 60 * 1000; // 5 minutes buffer
    const cutoffTime = event.timestamp - BUFFER_DURATION;

    const filtered = events.filter(e => e.type === 2 || e.timestamp >= cutoffTime);

    await storage.set([...filtered, event]);
  },

  getEvents: async () => await storage.get(),
  clearEvents: async () => await storage.set([]),
  setEvents: async (events: RecordingEvent[]) => await storage.set(events),

  getRecentEvents: async (duration: number) => {
    const events = await storage.get();
    if (events.length === 0) return [];

    const endTime = events[events.length - 1].timestamp;
    const cutoffTime = endTime - duration;

    let snapshotIndex = -1;
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].type === 2 && events[i].timestamp <= cutoffTime) {
        snapshotIndex = i;
        break;
      }
    }

    if (snapshotIndex === -1) {
      snapshotIndex = events.findIndex(e => e.type === 2);
      if (snapshotIndex === -1) return [];
    }

    return events.slice(snapshotIndex).filter(e => e.type === 2 || e.timestamp >= cutoffTime);
  },
};

export interface RecordingEvent {
  type: number;
  data: any;
  timestamp: number;
}
