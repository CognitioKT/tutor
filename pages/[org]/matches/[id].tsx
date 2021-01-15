import Router, { useRouter } from 'next/router';
import { useEffect } from 'react';
import useSWR from 'swr';

import { EmptyHeader } from 'components/navigation';
import MatchDisplay from 'components/match/display';
import Page from 'components/page';

import {
  Match,
  MatchJSON,
  Meeting,
  MeetingJSON,
  Org,
  OrgJSON,
  User,
  UserJSON,
} from 'lib/model';
import { APIError } from 'lib/api/error';
import { OrgContext } from 'lib/context/org';
import { usePage } from 'lib/hooks';
import { useUser } from 'lib/context/user';
import { withI18n } from 'lib/intl';

import common from 'locales/en/common.json';
import match from 'locales/en/match.json';
import matches from 'locales/en/matches.json';

function MatchDisplayPage(): JSX.Element {
  const { loggedIn } = useUser();
  const { query } = useRouter();
  const { data: org, error: orgError } = useSWR<OrgJSON, APIError>(
    typeof query.org === 'string' ? `/api/orgs/${query.org}` : null
  );
  const { data: match, error: matchError } = useSWR<MatchJSON, APIError>(
    typeof query.id === 'string' ? `/api/matches/${query.id}` : null
  );
  const { data: people, error: peopleError } = useSWR<UserJSON[], APIError>(
    typeof query.id === 'string' ? `/api/matches/${query.id}/people` : null
  );
  const { data: meetings, error: meetingsError } = useSWR<
    MeetingJSON[],
    APIError
  >(typeof query.id === 'string' ? `/api/matches/${query.id}/meetings` : null);

  useEffect(() => {
    if (
      loggedIn &&
      [orgError, matchError, peopleError, meetingsError].some(
        (e) => e?.code === 401
      )
    ) {
      void Router.replace('/404');
    }
  }, [loggedIn, orgError, matchError, peopleError, meetingsError]);

  // TODO: Redirect to 404 page when SWR throws a 401 error.
  usePage({
    name: 'Match Display',
    url: `/${query.org as string}/matches/${query.id as string}`,
    org: query.org as string,
    login: true,
  });

  return (
    <OrgContext.Provider value={{ org: org ? Org.fromJSON(org) : undefined }}>
      <Page title='Match - Tutorbook'>
        <EmptyHeader />
        <MatchDisplay
          match={match ? Match.fromJSON(match) : undefined}
          people={people ? people.map((p) => User.fromJSON(p)) : undefined}
          meetings={
            meetings ? meetings.map((m) => Meeting.fromJSON(m)) : undefined
          }
        />
      </Page>
    </OrgContext.Provider>
  );
}

export default withI18n(MatchDisplayPage, { common, match, matches });
