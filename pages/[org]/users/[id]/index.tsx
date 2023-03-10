import { ParsedUrlQuery } from 'querystring';

import { GetStaticPaths, GetStaticProps, GetStaticPropsContext } from 'next';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import useTranslation from 'next-translate/useTranslation';

import { EmptyHeader, TabHeader } from 'components/navigation';
import Page from 'components/page';
import UserDisplay from 'components/user/display';

import { Org, OrgJSON } from 'lib/model/org';
import { PageProps, getPageProps } from 'lib/page';
import { User, UserJSON } from 'lib/model/user';
import { getLangLabels, getSubjectLabels } from 'lib/intl/utils';
import { OrgContext } from 'lib/context/org';
import { getOrg } from 'lib/api/db/org';
import getTruncatedUser from 'lib/api/get/truncated-user';
import { getUser } from 'lib/api/db/user';
import usePage from 'lib/hooks/page';
import { useUser } from 'lib/context/user';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import error from 'locales/en/error.json';
import match3rd from 'locales/en/match3rd.json';
import user3rd from 'locales/en/user3rd.json';

// We send the `subjects` and `langs` of the user properly translated as props
// so as to avoid a flash of invalid data (e.g. locale codes instead of labels).
interface UserDisplayPageProps extends PageProps {
  org?: OrgJSON;
  user?: UserJSON;
  langs?: string[];
  subjects?: string[];
}

function UserDisplayPage({
  org,
  user: fallbackData,
  langs: initialLangs,
  subjects: initialSubjects,
  ...props
}: UserDisplayPageProps): JSX.Element {
  const { query } = useRouter();
  const { orgs } = useUser();

  // TODO: The router query should update before Next.js fetches static props.
  // That way, SWR will fetch the full user data while Next.js fetches the
  // static props and SWR will then ignore the truncated data.
  // @see {@link https://github.com/vercel/next.js/issues/19492}
  const { data } = useSWR<UserJSON>(
    typeof query.id === 'string' ? `/api/users/${query.id}` : null,
    { fallbackData, revalidateOnMount: true }
  );
  const [langs, setLangs] = useState<string[]>(initialLangs || []);
  const [subjects, setSubjects] = useState<string[]>(initialSubjects || []);

  const admin = useMemo(
    () => orgs.some((o) => data?.orgs.includes(o.id)),
    [orgs, data?.orgs]
  );

  useEffect(() => setLangs((p) => initialLangs || p), [initialLangs]);
  useEffect(() => setSubjects((p) => initialSubjects || p), [initialSubjects]);

  const { lang: locale } = useTranslation();
  useEffect(() => {
    async function fetchLangs(): Promise<void> {
      if (data) setLangs(await getLangLabels(data.langs, locale));
    }
    void fetchLangs();
  }, [data, locale]);
  useEffect(() => {
    async function fetchSubjects(): Promise<void> {
      if (!data) return;
      setSubjects(await getSubjectLabels(data.subjects, locale));
    }
    void fetchSubjects();
  }, [data, locale]);

  usePage('User Display');

  return (
    <OrgContext.Provider value={{ org: org ? Org.fromJSON(org) : undefined }}>
      <Page
        title={`${data?.name || 'Loading'} - Tutorbook`}
        description={data?.bio}
        {...props}
      >
        {!admin && <EmptyHeader />}
        {admin && (
          <TabHeader
            tabs={[
              {
                active: true,
                label: 'About',
                href: `/${query.org as string}/users/${query.id as string}`,
              },
              {
                label: 'Edit',
                href: `/${query.org as string}/users/${query.id as string}/edit`,
              },
              {
                label: 'Hours',
                href: `/${query.org as string}/users/${
                  query.id as string
                }/hours`,
              },
            ]}
          />
        )}
        <UserDisplay
          user={data ? User.fromJSON(data) : undefined}
          subjects={subjects}
          langs={langs}
        />
      </Page>
    </OrgContext.Provider>
  );
}

interface UserDisplayPageQuery extends ParsedUrlQuery {
  org: string;
  id: string;
}

// Only public (truncated) data is used when generating static pages. Once
// hydrated, SWR is used client-side to continually update the full page data.
export const getStaticProps: GetStaticProps<
  UserDisplayPageProps,
  UserDisplayPageQuery
> = async (ctx: GetStaticPropsContext<UserDisplayPageQuery>) => {
  if (!ctx.params) throw new Error('Cannot fetch org and user w/out params.');
  try {
    const [org, user] = await Promise.all([
      getOrg(ctx.params.org),
      getUser(ctx.params.id),
    ]);
    const [langs, subjects] = await Promise.all([
      getLangLabels(user.langs),
      getSubjectLabels(user.subjects),
    ]);
    const { props } = await getPageProps();
    // Note that because Next.js cannot expose the `req` object when fetching
    // static props, there are a couple of possible data change flashes:
    // 1. If the user is an admin, the user's full name and the "edit" and "vet"
    //    icon buttons will appear after SWR fetches the user data client-side.
    // 2. If there is an `aspect` specified as a query parameter, the user's
    //    "teaches" section could change.
    return {
      props: {
        langs,
        subjects,
        org: org.toJSON(),
        user: getTruncatedUser(user).toJSON(),
        ...props,
      },
      revalidate: 1,
    };
  } catch (e) {
    return { notFound: true, revalidate: 1 };
  }
};

export const getStaticPaths: GetStaticPaths<UserDisplayPageQuery> =
  async () => ({ paths: [], fallback: true });

export default withI18n(UserDisplayPage, { common, error, match3rd, user3rd });
