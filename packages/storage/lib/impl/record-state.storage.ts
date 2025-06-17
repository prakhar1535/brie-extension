import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type RecordState = 'idle' | 'recording' | 'paused' | 'unsaved';

type RecordStateStorage = BaseStorage<RecordState> & {
  setRecordState: (state: RecordState) => Promise<void>;
  getRecordState: () => Promise<RecordState>;
};

const storage = createStorage<RecordState>(
  'record-state-storage-key',
  'idle', // Default state is idle
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const recordStateStorage: RecordStateStorage = {
  ...storage,

  // Set the record state (idle, recording, paused, unsaved)
  setRecordState: async (state: RecordState) => {
    await storage.set(state);
  },

  // Get the current record state
  getRecordState: async () => {
    return await storage.get();
  },
};
