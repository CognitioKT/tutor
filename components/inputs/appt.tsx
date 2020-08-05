import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  FormEvent,
} from 'react';
import UserSelect from 'components/user-select';
import SubjectSelect from 'components/subject-select';

import dynamic from 'next/dynamic';
import useTranslation from 'next-translate/useTranslation';

import { v4 as uuid } from 'uuid';

import { TextField } from '@rmwc/textfield';
import { Appt, Attendee, Role, Availability } from 'lib/model';
import { TimesSelectProps } from 'components/times-select';
import { InputsProps, InputsConfig } from './types';

const TimesSelect = dynamic<TimesSelectProps>(async () =>
  import('components/times-select')
);

function getValue(attendees: Attendee[], role: Role): string[] {
  return attendees.filter((a) => a.roles.indexOf(role) >= 0).map((a) => a.id);
}

type Input =
  | 'subjects'
  | 'times'
  | 'message'
  | 'tutors'
  | 'tutees'
  | 'mentors'
  | 'mentees';

export default function ApptInputs({
  value,
  onChange,
  focused: focusTarget,
  renderToPortal,
  className,
  tutors: showTutors,
  tutees: showTutees,
  mentors: showMentors,
  mentees: showMentees,
  subjects,
  times,
  message,
}: InputsProps<Appt, Input> & InputsConfig<Input>): JSX.Element {
  const onTutorsChange = useCallback(
    (ids: string[]) => {
      const attendees = [
        ...value.attendees.filter((a) => a.roles.indexOf('tutor') < 0),
        ...ids.map((id) => ({ id, roles: ['tutor'], handle: uuid() })),
      ] as Attendee[];
      onChange(new Appt({ ...value, attendees }));
    },
    [onChange, value]
  );
  const onTuteesChange = useCallback(
    (ids: string[]) => {
      const attendees = [
        ...value.attendees.filter((a) => a.roles.indexOf('tutee') < 0),
        ...ids.map((id) => ({ id, roles: ['tutee'], handle: uuid() })),
      ] as Attendee[];
      onChange(new Appt({ ...value, attendees }));
    },
    [onChange, value]
  );
  const onMentorsChange = useCallback(
    (ids: string[]) => {
      const attendees = [
        ...value.attendees.filter((a) => a.roles.indexOf('mentor') < 0),
        ...ids.map((id) => ({ id, roles: ['mentor'], handle: uuid() })),
      ] as Attendee[];
      onChange(new Appt({ ...value, attendees }));
    },
    [onChange, value]
  );
  const onMenteesChange = useCallback(
    (ids: string[]) => {
      const attendees = [
        ...value.attendees.filter((a) => a.roles.indexOf('mentee') < 0),
        ...ids.map((id) => ({ id, roles: ['mentee'], handle: uuid() })),
      ] as Attendee[];
      onChange(new Appt({ ...value, attendees }));
    },
    [onChange, value]
  );
  const onSubjectsChange = useCallback(
    (s: string[]) => {
      onChange(new Appt({ ...value, subjects: s }));
    },
    [onChange, value]
  );
  const onTimesChange = useCallback(
    (a: Availability) => {
      onChange(new Appt({ ...value, times: a }));
    },
    [onChange, value]
  );
  const onMessageChange = useCallback(
    (e: FormEvent<HTMLInputElement>) => {
      onChange(new Appt({ ...value, message: e.currentTarget.value }));
    },
    [onChange, value]
  );

  const { t } = useTranslation();
  const [focused, setFocused] = useState<Input | undefined>(focusTarget);

  const focusTutors = useCallback(() => setFocused('tutors'), []);
  const focusTutees = useCallback(() => setFocused('tutees'), []);
  const focusMentors = useCallback(() => setFocused('mentors'), []);
  const focusMentees = useCallback(() => setFocused('mentees'), []);
  const focusSubjects = useCallback(() => setFocused('subjects'), []);
  const focusTimes = useCallback(() => setFocused('times'), []);
  const focusMessage = useCallback(() => setFocused('message'), []);
  const focusNothing = useCallback(() => setFocused(undefined), []);

  useEffect(() => setFocused(focusTarget), [focusTarget]);

  const tutors = useMemo(() => {
    return getValue(value.attendees, 'tutor');
  }, [value.attendees]);
  const tutees = useMemo(() => {
    return getValue(value.attendees, 'tutee');
  }, [value.attendees]);
  const mentors = useMemo(() => {
    return getValue(value.attendees, 'mentor');
  }, [value.attendees]);
  const mentees = useMemo(() => {
    return getValue(value.attendees, 'mentee');
  }, [value.attendees]);

  return (
    <>
      {showTutors && (
        <UserSelect
          focused={focused === 'tutors'}
          label={t('appt:tutors')}
          onFocused={focusTutors}
          onBlurred={focusNothing}
          onChange={onTutorsChange}
          value={tutors}
          renderToPortal={renderToPortal}
          className={className}
          outlined
        />
      )}
      {showTutees && (
        <UserSelect
          focused={focused === 'tutees'}
          label={t('appt:tutees')}
          onFocused={focusTutees}
          onBlurred={focusNothing}
          onChange={onTuteesChange}
          value={tutees}
          renderToPortal={renderToPortal}
          className={className}
          outlined
        />
      )}
      {showMentors && (
        <UserSelect
          focused={focused === 'mentors'}
          label={t('appt:mentors')}
          onFocused={focusMentors}
          onBlurred={focusNothing}
          onChange={onMentorsChange}
          value={mentors}
          renderToPortal={renderToPortal}
          className={className}
          outlined
        />
      )}
      {showMentees && (
        <UserSelect
          focused={focused === 'mentees'}
          label={t('appt:mentees')}
          onFocused={focusMentees}
          onBlurred={focusNothing}
          onChange={onMenteesChange}
          value={mentees}
          renderToPortal={renderToPortal}
          className={className}
          outlined
        />
      )}
      {subjects && (
        <SubjectSelect
          focused={focused === 'subjects'}
          label={t('appt:subjects')}
          onFocused={focusSubjects}
          onBlurred={focusNothing}
          onChange={onSubjectsChange}
          value={value.subjects}
          autoOpenMenu
          renderToPortal={renderToPortal}
          className={className}
          outlined
        />
      )}
      {times && (
        <TimesSelect
          focused={focused === 'subjects'}
          label={t('appt:times')}
          onFocused={focusTimes}
          onBlurred={focusNothing}
          onChange={onTimesChange}
          value={value.times || new Availability()}
          renderToPortal={renderToPortal}
          className={className}
          outlined
        />
      )}
      {message && (
        <TextField
          textarea
          rows={4}
          characterCount
          maxLength={500}
          label={t('appt:message')}
          placeholder={t('appt:message-placeholder', {
            subject: value.subjects[0] || 'Computer Science',
          })}
          onFocus={focusMessage}
          onBlur={focusNothing}
          onChange={onMessageChange}
          value={value.message}
          className={className}
          outlined
        />
      )}
    </>
  );
}