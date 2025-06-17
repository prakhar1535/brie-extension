import * as rrweb from 'rrweb';

import { recordingEventsStorage } from '@extension/storage/lib/impl/recording-events.storage.js';

const BUFFER_DURATION = 5 * 60 * 1000; // 5 minutes buffer
const REPLAY_DURATION = 30 * 1000; // last 30 seconds for replay

type RRWebEvent = {
  type: number;
  data: any;
  timestamp: number;
};

export class ScreenRecordManager {
  private stopFn: (() => void) | null = null;
  private isRecording = false;
  private isPaused = false;
  private events: RRWebEvent[] = [];

  async startRecording(type: 'full-page' | 'viewport' | 'area') {
    if (this.isRecording) return;

    try {
      await recordingEventsStorage.clearEvents();
      this.events = [];

      const stopFn = rrweb.record({
        emit: event => {
          if (!this.isPaused) {
            this.events = this.updateEventsBuffer(event);
            // Store the buffered events
            this.storeEventsAsync();
          }
        },
        recordCanvas: true,
        collectFonts: true,
        checkoutEveryNms: BUFFER_DURATION, // Force full snapshot every 5 mins
        sampling: {
          // Optimize based on recording type
          scroll: type === 'full-page' ? 100 : 150,
          mousemove: type === 'area' ? 50 : 100,
          input: 'last',
        },
      });

      this.stopFn = stopFn || null;
      this.isRecording = true;
      this.isPaused = false;

      console.log('Recording started:', type);
      return { success: true };
    } catch (error) {
      console.error('Failed to start recording:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private updateEventsBuffer(event: RRWebEvent): RRWebEvent[] {
    const cutoffTime = event.timestamp - BUFFER_DURATION;

    // Keep only snapshots and events within the buffer
    const filtered = this.events.filter(e => e.type === 2 || e.timestamp >= cutoffTime);

    return [...filtered, event];
  }

  private async storeEventsAsync() {
    try {
      // Convert rrweb events to storage format
      const storageEvents = this.events.map(event => ({
        type: event.type,
        data: event.data,
        timestamp: event.timestamp,
      }));
      await recordingEventsStorage.setEvents(storageEvents);
    } catch (error) {
      console.error('Failed to store events:', error);
    }
  }

  stopRecording() {
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }
    this.isRecording = false;
    this.isPaused = false;
    console.log('Recording stopped');
    return { success: true };
  }

  pauseRecording() {
    if (this.isRecording) {
      this.isPaused = true;
      console.log('Recording paused');
      return { success: true };
    }
    return { success: false };
  }

  resumeRecording() {
    if (this.isRecording && this.isPaused) {
      this.isPaused = false;
      console.log('Recording resumed');
      return { success: true };
    }
    return { success: false };
  }

  async getRecordingData() {
    const events = await recordingEventsStorage.getEvents();
    return { events, isRecording: this.isRecording, isPaused: this.isPaused };
  }

  async getReplayData(duration: number = REPLAY_DURATION): Promise<RRWebEvent[]> {
    if (this.events.length === 0) {
      // Fallback to stored events if memory events are empty
      const storedEvents = await recordingEventsStorage.getEvents();
      this.events = storedEvents.map(event => ({
        type: event.type,
        data: event.data,
        timestamp: event.timestamp,
      })) as RRWebEvent[];
    }

    if (this.events.length === 0) return [];

    const endTime = this.events[this.events.length - 1].timestamp;
    const cutoffTime = endTime - duration;

    // Find the last full snapshot before or at cutoffTime
    let snapshotIndex = -1;
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i].type === 2 && this.events[i].timestamp <= cutoffTime) {
        snapshotIndex = i;
        break;
      }
    }

    // If no snapshot found before cutoff, fallback to first available snapshot
    if (snapshotIndex === -1) {
      snapshotIndex = this.events.findIndex(e => e.type === 2);
      if (snapshotIndex === -1) {
        console.warn('No full snapshot available for replay.');
        return [];
      }
    }

    const trimmed = this.events.slice(snapshotIndex).filter(e => e.type === 2 || e.timestamp >= cutoffTime);

    return trimmed;
  }
}
