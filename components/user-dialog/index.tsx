import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Dialog } from '@rmwc/dialog';
import { v4 as uuid } from 'uuid';
import useSWR, { mutate } from 'swr';
import cn from 'classnames';
import useTranslation from 'next-translate/useTranslation';
import useWebAnimations from '@wellyshen/use-web-animations';

import {
  Aspect,
  Availability,
  FCallback,
  User,
  UserJSON,
  UsersQuery,
} from 'lib/model';
import Utils from 'lib/utils';
import { usePrevious } from 'lib/hooks';
import { useUser } from 'lib/account';

import DisplayPage from './display-page';
import EditPage from './edit-page';
import RequestPage from './request-page';
import styles from './user-dialog.module.scss';

type Page = 'edit' | 'display' | 'request';

// Animation durations and easing from the MWC spec and Sass implementation.
// @see {@link https://material.io/design/motion/the-motion-system.html#shared-axis}
// @see {@link https://material.io/develop/web/components/animation}
// @see {@link https://bit.ly/2EHiyDj}
const duration = 300;
const easing = 'cubic-bezier(.4, 0, .2, 1)';

// Animation for incoming page (i.e. the nested page) when navigating downward
// from parent page to a nested page.
const incomingFadeIn = {
  keyframes: [
    { opacity: 0, transform: 'scale(0.8)' },
    { opacity: 1, transform: 'scale(1.0)' },
  ],
  timing: { duration, easing },
};

// Animation for outgoing page (i.e. the parent page) when navigating downward
// from parent page to a nested page.
const outgoingFadeIn = {
  keyframes: [
    { opacity: 1, transform: 'scale(1.0)' },
    { opacity: 0, transform: 'scale(1.1)' },
  ],
  timing: { duration, easing },
};

// Animation for incoming page (i.e. the parent page) when navigating from a
// nested page to it's parent page. This is the exact inverse of the
// `outgoing-fade-in` keyframes.
const incomingFadeOut = {
  keyframes: [
    { opacity: 0, transform: 'scale(1.1)' },
    { opacity: 1, transform: 'scale(1.0)' },
  ],
  timing: { duration, easing },
};

// Animation for outgoing page (i.e. the nested page) when navigating from a
// nested page to it's parent page. This is the exact inverse of the
// `incoming-fade-in` keyframes.
const outgoingFadeOut = {
  keyframes: [
    { opacity: 1, transform: 'scale(1.0)' },
    { opacity: 0, transform: 'scale(0.8)' },
  ],
  timing: { duration, easing },
};

export interface UserDialogProps {
  id?: string;
  setQuery: FCallback<UsersQuery>;
  initialData?: UserJSON;
  initialPage?: Page;
  onClosed: () => void;
}

// This wrapper component merely manages the navigation transitions between it's
// children. The default visible page is the `DisplayPage` but that can be
// configured via the `page` prop.
export default function UserDialog({
  onClosed,
  setQuery,
  initialData = new User().toJSON(),
  initialPage = 'display',
}: UserDialogProps): JSX.Element {
  // Temporary ID that is used to locally mutate SWR data (without calling API).
  // We have to use a stateful variable for our ID to support user creation.
  // @see {@link https://github.com/vercel/swr/issues/576}
  if (!initialData.id) initialData.id = `temp-${uuid()}`;
  const [id, setId] = useState<string>(initialData.id);
  const { data } = useSWR<UserJSON>(`/api/users/${id}`, { initialData });
  const user = data as UserJSON;

  const onChange = useCallback(async (updated: UserJSON) => {
    setId(updated.id);
    await mutate(`/api/users/${updated.id}`, updated, false);
  }, []);

  const { ref: displayRef, animate: animateDisplay } = useWebAnimations();
  const { ref: editRef, animate: animateEdit } = useWebAnimations();
  const { ref: requestRef, animate: animateRequest } = useWebAnimations();

  const [active, setActive] = useState<Page>(initialPage);
  const prevActive = usePrevious<Page>(active);

  useLayoutEffect(() => {
    // Don't animate the initial page (we only want to animate when the user is
    // performing navigations **within** this dialog... not when opening it).
    if (!prevActive) return;
    // TODO: Why is this being called multiple times for each page transition?
    switch (active) {
      case 'edit':
        animateEdit(incomingFadeIn);
        animateDisplay(outgoingFadeIn);
        break;
      case 'request':
        animateRequest(incomingFadeIn);
        animateDisplay(outgoingFadeIn);
        break;
      default:
        animateDisplay(incomingFadeOut);
        if (prevActive === 'edit') animateEdit(outgoingFadeOut);
        if (prevActive === 'request') animateRequest(outgoingFadeOut);
        break;
    }
  }, [active, prevActive, animateDisplay, animateEdit, animateRequest]);

  const openEdit = useCallback(() => {
    setActive('edit');
    return new Promise<void>((resolve) => setTimeout(resolve, duration));
  }, []);
  const openRequest = useCallback(() => {
    setActive('request');
    return new Promise<void>((resolve) => setTimeout(resolve, duration));
  }, []);
  const openDisplay = useCallback(() => {
    setActive('display');
    return new Promise<void>((resolve) => setTimeout(resolve, duration));
  }, []);

  const { updateUser } = useUser();
  const { lang: locale } = useTranslation();
  const openMatch = useCallback(async () => {
    await updateUser((prev) => {
      const { matching } = prev;
      if (matching.indexOf(user.id) < 0) matching.push(user.id);
      return { ...prev, matching };
    });
    const stringToOption = (str: string) => ({ label: str, value: str });
    let aspect: Aspect = 'mentoring';
    /* eslint-disable-next-line no-return-assign */
    setQuery(
      (prev) =>
        new UsersQuery({
          ...prev,
          subjects: user[(aspect = prev.aspect)].searches.map(stringToOption),
          availability: Availability.fromJSON(user.availability),
          langs: user.langs.map(stringToOption),
          visible: true,
          query: '',
          tags: [],
          page: 0,
        })
    );
    onClosed();
    const langs = await Utils.langsToOptions(user.langs, locale);
    const subjects = await Utils.subjectsToOptions(user[aspect].searches);
    setQuery((prev) => new UsersQuery({ ...prev, subjects, langs }));
  }, [updateUser, user, onClosed, setQuery, locale]);

  const [open, setOpen] = useState<boolean>(true);
  const onDisplayClosed = useCallback(() => setOpen(false), []);

  return (
    <Dialog open={open} onClosed={onClosed} className={styles.dialog}>
      <div
        className={cn(styles.page, { [styles.active]: active === 'display' })}
        ref={displayRef as React.RefObject<HTMLDivElement>}
      >
        <DisplayPage
          value={user}
          openEdit={openEdit}
          openMatch={openMatch}
          openRequest={openRequest}
          onClosed={onDisplayClosed}
          onChange={onChange}
        />
      </div>
      <div
        className={cn(styles.page, { [styles.active]: active === 'edit' })}
        ref={editRef as React.RefObject<HTMLDivElement>}
      >
        <EditPage value={user} onChange={onChange} openDisplay={openDisplay} />
      </div>
      <div
        className={cn(styles.page, { [styles.active]: active === 'request' })}
        ref={requestRef as React.RefObject<HTMLDivElement>}
      >
        <RequestPage value={user} openDisplay={openDisplay} />
      </div>
    </Dialog>
  );
}
