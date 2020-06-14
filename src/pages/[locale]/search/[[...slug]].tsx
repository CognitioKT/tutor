import React from 'react';
import { GetServerSideProps } from 'next';
import { ParsedUrlQuery } from 'querystring';
import axios, { AxiosResponse, AxiosError } from 'axios';

import to from 'await-to-js';

import * as admin from 'firebase-admin';
import { v4 as uuid } from 'uuid';

import Intercom from '@tutorbook/react-intercom';
import Footer from '@tutorbook/footer';
import Search from '@tutorbook/search';

import { QueryHeader } from '@tutorbook/header';
import { getIntlProps, withIntl } from '@tutorbook/intl';
import {
  ApiError,
  Option,
  User,
  UserJSON,
  SearchResult,
  Query,
  Aspect,
  QueryJSONInterface,
  Availability,
} from '@tutorbook/model';

type App = admin.app.App;
type DocumentReference = admin.firestore.DocumentReference;
type DocumentSnapshot = admin.firestore.DocumentSnapshot;

interface SearchPageProps {
  query: QueryJSONInterface;
  results: ReadonlyArray<SearchResult>;
  user?: SearchResult;
}

function onlyFirstAndLastInitial(name: string): string {
  const split: string[] = name.split(' ');
  return `${split[0]} ${split[split.length - 1][0]}.`;
}

async function getSearchResults(
  query: Query,
  url = '/api/search'
): Promise<ReadonlyArray<User>> {
  const [err, res] = await to<
    AxiosResponse<SearchResult[]>,
    AxiosError<ApiError>
  >(
    axios({
      url,
      method: 'get',
      params: {
        langs: encodeURIComponent(JSON.stringify(query.langs)),
        subjects: encodeURIComponent(JSON.stringify(query.subjects)),
        availability: query.availability.toURLParam(),
        aspect: encodeURIComponent(query.aspect),
      },
    })
  );
  if (err && err.response) {
    console.error(`[ERROR] ${err.response.data.msg}`);
    throw new Error(err.response.data.msg);
  } else if (err && err.request) {
    console.error('[ERROR] Search REST API did not respond:', err.request);
    throw new Error('Search REST API did not respond.');
  } else if (err) {
    console.error('[ERROR] While sending request:', err);
    throw new Error(`While sending request: ${err.message}`);
  } else {
    return (res as AxiosResponse<SearchResult[]>).data.map(
      (user: SearchResult) => {
        return User.fromJSON(user as UserJSON);
      }
    );
  }
}

/**
 * We search our Algolia index from the server-side before we even respond to
 * an HTTP request.
 * @todo Remove the `JSON.parse(JSON.stringify(ob))` workaround.
 */
export const getServerSideProps: GetServerSideProps = async (context) => {
  async function getUser(
    params?: ParsedUrlQuery
  ): Promise<SearchResult | null> {
    if (!params || !params.slug || !params.slug.length) return null;

    /**
     * Initializes a new `firebase.admin` instance with limited database/Firestore
     * capabilities (using the `databaseAuthVariableOverride` option).
     * @see {@link https://firebase.google.com/docs/reference/admin/node/admin.AppOptions#optional-databaseauthvariableoverride}
     * @see {@link https://firebase.google.com/docs/database/admin/start#authenticate-with-limited-privileges}
     *
     * Also note that we use [UUID]{@link https://github.com/uuidjs/uuid} package to
     * generate a unique `firebaseAppId` every time this API is called.
     * @todo Lift this Firebase app definition to a top-level file that is imported
     * by all the `/api/` endpoints.
     *
     * We have a workaround for the `FIREBASE_ADMIN_KEY` error we were encountering
     * on Vercel a while ago.
     * @see {@link https://github.com/tutorbookapp/covid-tutoring/issues/29}
     * @see {@link https://stackoverflow.com/a/41044630/10023158}
     * @see {@link https://stackoverflow.com/a/50376092/10023158}
     */
    const firebase: App = admin.initializeApp(
      {
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: (process.env.FIREBASE_ADMIN_KEY as string).replace(
            /\\n/g,
            '\n'
          ),
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
        serviceAccountId: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        databaseAuthVariableOverride: { uid: 'server' },
      },
      uuid()
    );
    const db: DocumentReference =
      process.env.NODE_ENV === 'development'
        ? firebase.firestore().collection('partitions').doc('test')
        : firebase.firestore().collection('partitions').doc('default');

    const userDoc: DocumentSnapshot = await db
      .collection('users')
      .doc(params.slug[0])
      .get();
    if (!userDoc.exists) return null;
    const user: User = User.fromFirestore(userDoc);
    return {
      name: onlyFirstAndLastInitial(user.name),
      photo: user.photo,
      bio: user.bio,
      availability: user.availability.toJSON(),
      mentoring: user.mentoring,
      tutoring: user.tutoring,
      socials: user.socials,
      langs: user.langs,
      id: user.id,
    };
  }

  const langs: string = context.query.langs as string;
  const aspect: string = context.query.aspect as string;
  const subjects: string = context.query.subjects as string;
  const availability: string = context.query.availability as string;
  const query: Query = {
    langs: langs
      ? (JSON.parse(decodeURIComponent(langs)) as Option<string>[])
      : [],
    subjects: subjects
      ? (JSON.parse(decodeURIComponent(subjects)) as Option<string>[])
      : [],
    availability: availability
      ? Availability.fromURLParam(availability)
      : new Availability(),
    aspect: aspect ? (decodeURIComponent(aspect) as Aspect) : 'mentoring',
  };
  const url: string = new URL(
    '/api/search',
    `http:${context.req.headers.host as string}`
  ).href;
  return {
    props: {
      query: JSON.parse(JSON.stringify(query)) as QueryJSONInterface,
      results: JSON.parse(
        JSON.stringify(await getSearchResults(query, url))
      ) as SearchResult[],
      user: JSON.parse(
        JSON.stringify(await getUser(context.params))
      ) as SearchResult | null,
      ...(await getIntlProps(context)),
    },
  };
};

function SearchPage({ query, results, user }: SearchPageProps): JSX.Element {
  const [searching, setSearching] = React.useState<boolean>(false);
  const [res, setResults] = React.useState<ReadonlyArray<User>>(
    results.map((searchResult: SearchResult) =>
      User.fromJSON(searchResult as UserJSON)
    )
  );
  const [qry, setQuery] = React.useState<Query>({
    langs: query.langs,
    subjects: query.subjects,
    availability: Availability.fromJSON(query.availability),
    aspect: query.aspect,
  });
  const handleChange = async (newQuery: Query) => {
    // TODO: Store the availability filters in the tutoring aspect and then
    // re-fill them when we go back to that aspect. Or, just keep them in the
    // query and ignore them when searching for mentors (i.e. in `api/search`).
    const updatedQuery: Query =
      newQuery.aspect === 'mentoring'
        ? { ...newQuery, availability: new Availability() }
        : newQuery;
    setQuery(updatedQuery);
    setSearching(true);
    setResults(await getSearchResults(updatedQuery));
    setSearching(false);
  };
  return (
    <>
      <QueryHeader query={qry} onChange={handleChange} />
      <Search
        query={qry}
        results={res}
        searching={searching}
        user={user ? User.fromJSON(user as UserJSON) : undefined}
        onChange={handleChange}
      />
      <Footer />
      <Intercom />
    </>
  );
}

export default withIntl<SearchPageProps>(SearchPage);
