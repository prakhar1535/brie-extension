import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import * as rrweb from 'rrweb';
import rrwebPlayer from 'rrweb-player';

import 'rrweb-player/dist/style.css';
import { Button, Icon } from '@extension/ui';

interface RecordingReplayModalProps {
  events: any[];
  onClose: () => void;
  isVisible: boolean;
}

export const RecordingReplayModal: React.FC<RecordingReplayModalProps> = ({ events, onClose, isVisible }) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && events.length > 0 && containerRef.current) {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      // Clean up the container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      try {
        const player = new rrwebPlayer({
          target: containerRef.current,
          props: {
            events,
            width: Math.min(window.innerWidth * 0.8, 1200),
            height: Math.min(window.innerHeight * 0.6, 700),
            showWarning: false,
            autoPlay: true,
            speedOption: [0.5, 1, 1.5, 2, 4],
          },
        });

        playerRef.current = player;
      } catch (error) {
        console.error('Failed to create rrweb player:', error);
      }
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (error) {
          console.error('Error destroying player:', error);
        }
      }
    };
  }, [isVisible, events]);

  const handleClose = () => {
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
        playerRef.current = null;
      } catch (error) {
        console.error('Error destroying player on close:', error);
      }
    }
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative max-h-[95vh] w-full max-w-[95vw] overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold text-black">Recording Replay</h3>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <Icon name={'X' as any} size={20} />
          </Button>
        </div>

        <div className="p-4">
          {events.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-gray-500">
              <p>No recording data available</p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="rounded-md border bg-gray-50 text-black"
              style={{
                minHeight: '400px',
                minWidth: '600px',
                maxHeight: '70vh',
                overflow: 'hidden',
              }}
            />
          )}
        </div>

        <div className="flex justify-center border-t p-4">
          <Button onClick={handleClose}>Close Replay</Button>
        </div>
      </div>
    </div>
  );
};
