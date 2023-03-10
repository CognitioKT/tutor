import { FormEvent, useCallback } from 'react';
import { IconButton } from '@rmwc/icon-button';
import { Select } from '@rmwc/select';
import useTranslation from 'next-translate/useTranslation';

import ChevronLeftIcon from 'components/icons/chevron-left';
import ChevronRightIcon from 'components/icons/chevron-right';

import { Callback } from 'lib/model/callback';
import { Query } from 'lib/model/query/base';

import styles from './pagination.module.scss';

export interface PaginationProps<T extends Query> {
  hits: number;
  query: T;
  setQuery: Callback<T>;
  model: new (query: Partial<T>) => T;
}

// TODO: For some reason, the React `memo` types don't allow for the `T` type
// variable to be properly parsed by Typescript. Instead, I'll have to wrap a
// parent component around this one to provide that typing or something.
export default function Pagination<T extends Query>({
  hits,
  query,
  setQuery,
  model: QueryModel,
}: PaginationProps<T>): JSX.Element {
  const onHitsPerPageChange = useCallback(
    (event: FormEvent<HTMLSelectElement>) => {
      const hitsPerPage = Number(event.currentTarget.value);
      setQuery((prev) => new QueryModel({ ...prev, hitsPerPage, page: 0 }));
    },
    [QueryModel, setQuery]
  );
  const pageLeft = useCallback(() => {
    setQuery((prev) => new QueryModel({ ...prev, page: prev.page - 1 }));
  }, [QueryModel, setQuery]);
  const pageRight = useCallback(() => {
    setQuery((prev) => new QueryModel({ ...prev, page: prev.page + 1 }));
  }, [QueryModel, setQuery]);

  const { t } = useTranslation();

  return (
    <div className={styles.pagination}>
      <div className={styles.left} />
      <div className={styles.right}>
        <div className={styles.hitsPerPage}>
          {t('common:rows-per-page')}
          <Select
            enhanced
            value={`${query.hitsPerPage}`}
            options={['5', '10', '15', '20', '25', '30']}
            onChange={onHitsPerPageChange}
          />
        </div>
        <div className={styles.pageNumber}>
          {query.getPaginationString(hits)}
        </div>
        <IconButton
          disabled={query.page <= 0}
          icon={<ChevronLeftIcon />}
          onClick={pageLeft}
        />
        <IconButton
          disabled={query.page + 1 >= hits / query.hitsPerPage}
          icon={<ChevronRightIcon />}
          onClick={pageRight}
        />
      </div>
    </div>
  );
}
