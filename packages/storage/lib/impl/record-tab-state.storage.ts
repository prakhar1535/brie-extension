import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type RecordTabStorage = BaseStorage<number | null> & {
  setRecordTabId: (tabId: number | null) => Promise<void>;
  getRecordTabId: () => Promise<number | null>;
};

const storage = createStorage<number | null>(
  'record-tab-storage-key',
  null, // Default is no active tab
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const recordTabStorage: RecordTabStorage = {
  ...storage,

  // Set the record tabId
  setRecordTabId: async (tabId: number | null) => {
    await storage.set(tabId);
  },

  // Get the current record tabId
  getRecordTabId: async () => {
    return await storage.get();
  },
};
