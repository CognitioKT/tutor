import { animated, useSpring } from 'react-spring';
import { memo, useCallback } from 'react';
import useTranslation from 'next-translate/useTranslation';

import AvailabilitySelect from 'components/availability-select';
import LangSelect from 'components/lang-select';
import SubjectSelect from 'components/subject-select';
import TagSelect from 'components/tag-select';

import { DBUserTag, USER_TAGS } from 'lib/model/user';
import { Availability } from 'lib/model/availability';
import { Callback } from 'lib/model/callback';
import { Subject } from 'lib/model/subject';
import { UsersQuery } from 'lib/model/query/users';

import { config, width } from './spring-animation';
import styles from './filters-sheet.module.scss';

export interface FiltersSheetProps {
  query: UsersQuery;
  setQuery: Callback<UsersQuery>;
  open: boolean;
}

function FiltersSheet({
  query,
  setQuery,
  open,
}: FiltersSheetProps): JSX.Element {
  const { t } = useTranslation();

  const props = useSpring({ config, width: open ? width : 0 });

  const onSubjectsChange = useCallback(
    (subjects: Subject[]) => {
      setQuery((prev) => new UsersQuery({ ...prev, subjects, page: 0 }));
    },
    [setQuery]
  );
  const onAvailabilityChange = useCallback(
    (availability: Availability) => {
      setQuery((prev) => new UsersQuery({ ...prev, availability, page: 0 }));
    },
    [setQuery]
  );
  const onLangsChange = useCallback(
    (langs: string[]) => {
      setQuery((prev) => new UsersQuery({ ...prev, langs, page: 0 }));
    },
    [setQuery]
  );
  const onTagsChange = useCallback(
    (tags: DBUserTag[]) => {
      setQuery((prev) => new UsersQuery({ ...prev, tags, page: 0 }));
    },
    [setQuery]
  );

  return (
    <animated.div
      data-cy='filters-sheet'
      className={styles.wrapper}
      style={props}
    >
      <form className={styles.form} style={{ width }}>
        <SubjectSelect
          label={t('query:subjects')}
          onChange={onSubjectsChange}
          value={query.subjects}
          placeholder={t('common:subjects-placeholder')}
          className={styles.field}
          renderToPortal
          outlined
        />
        <AvailabilitySelect
          label={t('query:availability')}
          onChange={onAvailabilityChange}
          value={query.availability}
          className={styles.field}
          renderToPortal
          outlined
        />
        <LangSelect
          label={t('query:langs')}
          placeholder={t('common:langs-placeholder')}
          onChange={onLangsChange}
          value={query.langs}
          className={styles.field}
          renderToPortal
          outlined
        />
        <TagSelect
          label={t('query:tags')}
          placeholder={t('query:tags-placeholder')}
          onChange={onTagsChange}
          value={query.tags}
          className={styles.field}
          options={USER_TAGS}
          renderToPortal
          outlined
        />
      </form>
    </animated.div>
  );
}

export default memo(FiltersSheet);
