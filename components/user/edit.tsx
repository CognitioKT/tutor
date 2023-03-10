import { FormEvent, useCallback } from 'react';
import { Snackbar, SnackbarAction } from '@rmwc/snackbar';
import { Switch } from '@rmwc/switch';
import { TextField } from '@rmwc/textfield';
import axios from 'axios';
import { mutate } from 'swr';
import { useRouter } from 'next/router';
import useTranslation from 'next-translate/useTranslation';

import AvailabilitySelect from 'components/availability-select';
import LangSelect from 'components/lang-select';
import PhotoInput from 'components/photo-input';
import Result from 'components/search/result';
import SubjectSelect from 'components/subject-select';
import VenueInput from 'components/venue-input';

import { User, UserJSON } from 'lib/model/user';
import { Availability } from 'lib/model/availability';
import { Subject } from 'lib/model/subject';
import { useOrg } from 'lib/context/org';
import useContinuous from 'lib/hooks/continuous';
import useSocialProps from 'lib/hooks/social-props';

import styles from './edit.module.scss';

const empty = new User();

export interface UserEditProps {
  user?: User;
}

export default function UserEdit({
  user: fallbackData,
}: UserEditProps): JSX.Element {
  const updateLocal = useCallback(async (updated: User) => {
    await mutate(`/api/users/${updated.id}`, updated.toJSON(), false);
  }, []);
  const updateRemote = useCallback(async (updated: User) => {
    if (updated.id.startsWith('temp')) {
      const json = { ...updated.toJSON(), id: '' };
      const { data } = await axios.post<UserJSON>('/api/users', json);
      return User.fromJSON(data);
    }
    const url = `/api/users/${updated.id}`;
    const { data } = await axios.put<UserJSON>(url, updated.toJSON());
    return User.fromJSON(data);
  }, []);

  // TODO: Prevent revalidations of `fallbackData` when local data has been
  // updated (i.e. when switching between tabs to copy-and-paste data).

  const {
    data: user,
    setData: setUser,
    loading,
    checked,
    error,
    retry,
    timeout,
  } = useContinuous(fallbackData || empty, updateRemote, updateLocal);

  const router = useRouter();
  const getSocialProps = useSocialProps(
    user,
    setUser,
    styles.field,
    'user',
    User
  );

  const { org } = useOrg();
  const { t, lang: locale } = useTranslation();

  const onNameChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const name = evt.currentTarget.value;
      setUser((prev) => new User({ ...prev, name }));
    },
    [setUser]
  );
  const onEmailChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const email = evt.currentTarget.value;
      setUser((prev) => new User({ ...prev, email }));
    },
    [setUser]
  );
  const onPhoneChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const phone = evt.currentTarget.value;
      setUser((prev) => new User({ ...prev, phone }));
    },
    [setUser]
  );
  const onPhotoChange = useCallback(
    (photo: string) => {
      setUser((prev) => new User({ ...prev, photo }));
    },
    [setUser]
  );
  const onBackgroundChange = useCallback(
    (background: string) => {
      setUser((prev) => new User({ ...prev, background }));
    },
    [setUser]
  );
  const onVenueChange = useCallback(
    (venue: string) => {
      setUser((prev) => new User({ ...prev, venue }));
    },
    [setUser]
  );
  const onAvailabilityChange = useCallback(
    (availability: Availability) =>
      setUser((prev) => new User({ ...prev, availability })),
    [setUser]
  );
  const onBioChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const bio = evt.currentTarget.value;
      setUser((prev) => new User({ ...prev, bio }));
    },
    [setUser]
  );
  const onSubjectsChange = useCallback(
    (subjects: Subject[]) => {
      setUser((prev) => new User({ ...prev, subjects }));
    },
    [setUser]
  );
  const onLangsChange = useCallback(
    (langs: string[]) => {
      setUser((prev) => new User({ ...prev, langs }));
    },
    [setUser]
  );
  const onReferenceChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const reference = evt.currentTarget.value;
      setUser((prev) => new User({ ...prev, reference }));
    },
    [setUser]
  );
  const onVisibilityChange = useCallback(
    (evt: FormEvent<HTMLInputElement>) => {
      const visible = evt.currentTarget.checked;
      return setUser((prev) => new User({ ...prev, visible }));
    },
    [setUser]
  );

  return (
    <>
      {loading && (
        <Snackbar message={t('user:loading')} timeout={-1} leading open />
      )}
      {checked && <Snackbar message={t('user:checked')} leading open />}
      {error && (
        <Snackbar
          message={t('user:error', { count: timeout / 1000 })}
          timeout={-1}
          action={<SnackbarAction label={t('common:retry')} onClick={retry} />}
          leading
          open
        />
      )}
      <div className={styles.wrapper}>
        <Result
          user={user}
          loading={!fallbackData}
          className={styles.display}
          onClick={() => router.push(`/${org?.id}/users/${user.id}`)}
        />
        <Switch
          className={styles.switch}
          label={t('user:visible')}
          checked={user.visible}
          onChange={onVisibilityChange}
        />
        <div className={styles.card}>
          <div className={styles.inputs}>
            <TextField
              label={t('user:name')}
              value={user.name}
              onChange={onNameChange}
              className={styles.field}
              outlined
              required
            />
            <TextField
              label={t('user:email')}
              value={user.email}
              onChange={onEmailChange}
              className={styles.field}
              type='email'
              outlined
              required
            />
            <TextField
              label={t('user:phone')}
              value={user.phone ? user.phone : undefined}
              onChange={onPhoneChange}
              className={styles.field}
              type='tel'
              outlined
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <PhotoInput
              label={t('user:photo')}
              value={user.photo}
              onChange={onPhotoChange}
              className={styles.field}
              outlined
            />
            <PhotoInput
              label={t('user:background')}
              value={user.background}
              onChange={onBackgroundChange}
              className={styles.field}
              outlined
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <VenueInput
              name={user.firstName}
              label={t('user:venue')}
              value={user.venue}
              onChange={onVenueChange}
              className={styles.field}
              outlined
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <TextField
              label={t('user:reference', { org: org?.name || 'Tutorbook' })}
              placeholder={t('common:reference-placeholder', {
                org: org?.name || 'Tutorbook',
              })}
              value={user.reference}
              onChange={onReferenceChange}
              className={styles.field}
              outlined
              rows={3}
              textarea
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <LangSelect
              label={t('user:langs')}
              placeholder={t('common:langs-placeholder')}
              value={user.langs}
              onChange={onLangsChange}
              className={styles.field}
              renderToPortal
              outlined
            />
            <AvailabilitySelect
              label={t('user:availability')}
              value={user.availability}
              onChange={onAvailabilityChange}
              className={styles.field}
              renderToPortal
              outlined
            />
            <TextField
              label={t('user:bio')}
              placeholder={
                (org?.signup[locale] || {}).bio || t('common:bio-placeholder')
              }
              helpText={{
                persistent: true,
                children: t('common:bio-help', { name: `${user.firstName}'s` }),
              }}
              value={user.bio}
              onChange={onBioChange}
              className={styles.field}
              outlined
              rows={8}
              textarea
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <SubjectSelect
              label={t('user:subjects')}
              placeholder={t('common:subjects-placeholder')}
              value={user.subjects}
              onChange={onSubjectsChange}
              className={styles.field}
              renderToPortal
              outlined
            />
          </div>
          <div className={styles.divider} />
          <div className={styles.inputs}>
            <TextField {...getSocialProps('website')} />
            <TextField {...getSocialProps('facebook')} />
            <TextField {...getSocialProps('instagram')} />
            <TextField {...getSocialProps('twitter')} />
            <TextField {...getSocialProps('linkedin')} />
            <TextField {...getSocialProps('github')} />
            <TextField {...getSocialProps('indiehackers')} />
          </div>
        </div>
      </div>
    </>
  );
}
