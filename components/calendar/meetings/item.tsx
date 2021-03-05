import { useCallback, useMemo } from 'react';
import cn from 'classnames';

import { Meeting } from 'lib/model/meeting';
import { TCallback } from 'lib/model/callback';
import { useClickContext } from 'lib/hooks/click-outside';

import { MouseEventHackData, MouseEventHackTarget } from '../hack-types';
import { getHeight, getPosition } from '../utils';
import { useCalendarState } from '../state';

import MeetingContent from './content';
import styles from './item.module.scss';

export interface MeetingItemProps {
  now: Date;
  meeting: Meeting;
  leftPercent: number;
  widthPercent: number;
  setEventData: TCallback<MouseEventHackData>;
  setEventTarget: TCallback<MouseEventHackTarget>;
}

export default function MeetingItem({
  now,
  meeting,
  leftPercent,
  widthPercent,
  setEventData,
  setEventTarget,
}: MeetingItemProps): JSX.Element {
  const top = useMemo(() => getPosition(meeting.time.from).y, [
    meeting.time.from,
  ]);
  const left = useMemo(() => {
    if (leftPercent === 0) return '-1px';
    return `calc(${leftPercent * 100}% + 1px)`;
  }, [leftPercent]);
  const width = useMemo(() => {
    if (leftPercent === 0) return `calc(${widthPercent * 100}% + 1px)`;
    return `calc(${widthPercent * 100}% - 1px)`;
  }, [leftPercent, widthPercent]);
  const height = useMemo(() => getHeight(meeting.time), [meeting.time]);

  const { updateEl, removeEl } = useClickContext();
  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return removeEl(`meeting-item-${meeting.id}`);
      return updateEl(`meeting-item-${meeting.id}`, node);
    },
    [updateEl, removeEl, meeting.id]
  );

  const { editing, setEditing, rnd, setRnd, setDialog } = useCalendarState();

  return (
    <div
      style={{ top, left, width, height }}
      className={cn(styles.meeting, {
        [styles.elevated]: !rnd && editing.id === meeting.id,
        [styles.editing]: rnd && editing.id === meeting.id,
        [styles.past]: meeting.time.to <= now,
      })}
      onClick={(evt) => evt.stopPropagation()}
      onMouseDown={(evt) => {
        evt.stopPropagation();

        // Decide what to do after mousedown:
        // - If mousemove, then edit with RND (this is a drag).
        // - If mouseup, then view (this is a click).
        const edit = (e: MouseEvent) => {
          console.log('Editing meeting...');
          e.stopPropagation();
          removeListeners();
          setEditing(meeting);
          setEventTarget('middle');
          setEventData({
            screenX: e.screenX,
            screenY: e.screenY,
            clientX: e.clientX,
            clientY: e.clientY,
            button: e.button,
            buttons: e.buttons,
          });
          setRnd(true);
        };
        const view = (e: MouseEvent) => {
          console.log('Viewing meeting...');
          e.stopPropagation();
          removeListeners();
          setEditing(meeting);
          setDialog(true);
        };
        const removeListeners = () => {
          document.removeEventListener('mousemove', edit, { capture: true });
          document.removeEventListener('mouseup', view, { capture: true });
        };

        document.addEventListener('mousemove', edit, { capture: true });
        document.addEventListener('mouseup', view, { capture: true });
      }}
    >
      <MeetingContent ref={ref} meeting={meeting} height={height} />
      <span>
        <div
          className={styles.bottom}
          onMouseDown={(evt) => {
            evt.stopPropagation();
            setEditing(meeting);
            setEventTarget('bottom');
            setEventData({
              screenX: evt.screenX,
              screenY: evt.screenY,
              clientX: evt.clientX,
              clientY: evt.clientY,
              button: evt.button,
              buttons: evt.buttons,
            });
            setRnd(true);
          }}
        />
        <div
          className={styles.top}
          onMouseDown={(evt) => {
            evt.stopPropagation();
            setEditing(meeting);
            setEventTarget('top');
            setEventData({
              screenX: evt.screenX,
              screenY: evt.screenY,
              clientX: evt.clientX,
              clientY: evt.clientY,
              button: evt.button,
              buttons: evt.buttons,
            });
            setRnd(true);
          }}
        />
      </span>
    </div>
  );
}
