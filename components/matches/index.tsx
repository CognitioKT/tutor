import {
  DataTable,
  DataTableBody,
  DataTableContent,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
} from '@rmwc/data-table';
import useSWR, { mutate } from 'swr';
import { IconButton } from '@rmwc/icon-button';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Select } from '@rmwc/select';
import { TextField } from '@rmwc/textfield';
import axios from 'axios';
import useTranslation from 'next-translate/useTranslation';
import { v4 as uuid } from 'uuid';

import Placeholder from 'components/placeholder';
import { IntercomAPI } from 'components/react-intercom';
import Header from 'components/header';

import { ListMatchesRes } from 'lib/api/list-matches';
import { MatchJSON, MatchesQuery, Org } from 'lib/model';

import styles from './matches.module.scss';
import { LoadingRow, MatchRow } from './row';

interface MatchesProps {
  org: Org;
}

/**
 * The "Matches" view is a heterogenous combination of live-updating filtered
 * results and editability (similar to Google Sheets):
 * - Data automatically re-validates when filters are valid.
 * - Filters become invalid when data is edited or new users are being created.
 * - Creating new users locally updates the SWR data and calls the `/api/users`
 * API endpoint when the user has a valid email address.
 * - Local edits are pushed to remote after 5secs of no change.
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/87}
 * @see {@link https://github.com/tutorbookapp/tutorbook/issues/75}
 */
export default function Matches({ org }: MatchesProps): JSX.Element {
  const timeoutIds = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [valid, setValid] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(true);
  const [query, setQuery] = useState<MatchesQuery>(
    new MatchesQuery({
      orgs: [{ label: org.name, value: org.id }],
      hitsPerPage: 10,
    })
  );

  const loadingRows: JSX.Element[] = useMemo(
    () =>
      Array(query.hitsPerPage)
        .fill(null)
        .map(() => <LoadingRow key={uuid()} />),
    [query.hitsPerPage]
  );

  const { t } = useTranslation();
  // TODO: Control the re-validation using the `valid` state variable.
  // See: https://github.com/vercel/swr/issues/529
  const { data, isValidating } = useSWR<ListMatchesRes>(query.endpoint, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  useEffect(() => {
    setQuery((prev: MatchesQuery) => {
      return new MatchesQuery({
        ...prev,
        orgs: [{ label: org.name, value: org.id }],
      });
    });
  }, [org]);
  useEffect(() => {
    void mutate(query.endpoint);
  }, [query]);
  useEffect(() => {
    setSearching((prev: boolean) => prev && (isValidating || !data));
  }, [isValidating, data]);
  useEffect(() => {
    setValid((prev: boolean) => prev || searching);
  }, [searching]);

  const mutateMatch = useCallback(
    async (match: MatchJSON) => {
      if (timeoutIds.current[match.id]) {
        clearTimeout(timeoutIds.current[match.id]);
        delete timeoutIds.current[match.id];
      }

      const updateLocal = async (updated: MatchJSON, oldId?: string) => {
        await mutate(
          query.endpoint,
          (prev: ListMatchesRes) => {
            if (!prev) return prev;
            const { matches: old } = prev;
            const idx = old.findIndex((u) => u.id === (oldId || updated.id));
            if (idx < 0) return prev;
            const matches = [
              ...old.slice(0, idx),
              updated,
              ...old.slice(idx + 1),
            ];
            return { ...prev, matches };
          },
          false
        );
      };

      const updateRemote = async (updated: MatchJSON) => {
        const url = `/api/users/${updated.id}`;
        const { data: remoteData } = await axios.put<MatchJSON>(url, updated);
        await updateLocal(remoteData);
      };

      setValid(false); // Filters become invalid when data is updated.
      await updateLocal(match);

      // Only update the user profile remotely after 5secs of no change.
      // @see {@link https://github.com/vercel/swr/issues/482}
      timeoutIds.current[match.id] = setTimeout(() => {
        void updateRemote(match);
      }, 5000);
    },
    [query]
  );

  return (
    <>
      <Header
        header={t('common:matches')}
        body={t('matches:subtitle', { name: org.name })}
        actions={[
          {
            label: t('common:import-data'),
            onClick: () =>
              IntercomAPI('showNewMessage', t('matches:import-data-msg')),
          },
        ]}
      />
      <div className={styles.wrapper}>
        <div className={styles.filters}>
          <div className={styles.left} />
          <div className={styles.right}>
            <TextField
              outlined
              invalid={!valid && !!query.query}
              placeholder={t('matches:search-placeholder')}
              className={styles.searchField}
              value={query.query}
              onChange={(event: FormEvent<HTMLInputElement>) => {
                const q: string = event.currentTarget.value;
                setSearching(true);
                setQuery((p) => new MatchesQuery({ ...p, query: q, page: 0 }));
              }}
            />
          </div>
        </div>
        {(searching || !!(data ? data.matches : []).length) && (
          <DataTable className={styles.table}>
            <DataTableContent>
              <DataTableHead className={styles.header}>
                <DataTableRow>
                  <DataTableHeadCell className={styles.message}>
                    {t('match:message')}
                  </DataTableHeadCell>
                  <DataTableHeadCell className={styles.subjects}>
                    {t('match:subjects')}
                  </DataTableHeadCell>
                  <DataTableHeadCell className={styles.tutors}>
                    {t('common:tutors')}
                  </DataTableHeadCell>
                  <DataTableHeadCell className={styles.tutees}>
                    {t('common:tutees')}
                  </DataTableHeadCell>
                  <DataTableHeadCell className={styles.mentors}>
                    {t('common:mentors')}
                  </DataTableHeadCell>
                  <DataTableHeadCell className={styles.mentees}>
                    {t('common:mentees')}
                  </DataTableHeadCell>
                  <DataTableHeadCell className={styles.parents}>
                    {t('common:parents')}
                  </DataTableHeadCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {!searching &&
                  (data ? data.matches : []).map((match) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                      onChange={mutateMatch}
                    />
                  ))}
                {searching && loadingRows}
              </DataTableBody>
            </DataTableContent>
          </DataTable>
        )}
        {!searching && !(data ? data.matches : []).length && (
          <div className={styles.empty}>
            <Placeholder>{t('matches:empty')}</Placeholder>
          </div>
        )}
        <div className={styles.pagination}>
          <div className={styles.left} />
          <div className={styles.right}>
            <div className={styles.hitsPerPage}>
              {t('common:rows-per-page')}
              <Select
                enhanced
                value={`${query.hitsPerPage}`}
                options={['5', '10', '15', '20', '25', '30']}
                onChange={(event: FormEvent<HTMLSelectElement>) => {
                  const hitsPerPage = Number(event.currentTarget.value);
                  const page = 0;
                  setSearching(true);
                  setQuery(
                    (p) => new MatchesQuery({ ...p, hitsPerPage, page })
                  );
                }}
              />
            </div>
            <div className={styles.pageNumber}>
              {query.getPaginationString(data ? data.hits : 0)}
            </div>
            <IconButton
              disabled={query.page <= 0}
              icon='chevron_left'
              onClick={() => {
                setSearching(true);
                setQuery((p) => new MatchesQuery({ ...p, page: p.page - 1 }));
              }}
            />
            <IconButton
              disabled={
                query.page + 1 >= (data ? data.hits : 0) / query.hitsPerPage
              }
              icon='chevron_right'
              onClick={() => {
                setSearching(true);
                setQuery((p) => new MatchesQuery({ ...p, page: p.page + 1 }));
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}