import firebase from 'firebase/app';

import 'firebase/auth';
import 'firebase/firestore';
import 'cypress-file-upload';

// Add types to the existing global Cypress object.
// @see {@link https://github.com/prescottprue/cypress-firebase/blob/master/src/attachCustomCommands.ts#L123}
// @see {@link https://docs.cypress.io/guides/tooling/typescript-support.html#Types-for-custom-commands}
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      login: (uid?: string) => Chainable;
    }
  }
}

const clientCredentials = {
  apiKey: Cypress.env('FIREBASE_API_KEY') as string,
  authDomain: Cypress.env('FIREBASE_AUTH_DOMAIN') as string,
  databaseURL: Cypress.env('FIREBASE_DATABASE_URL') as string,
  projectId: Cypress.env('FIREBASE_PROJECT_ID') as string,
  storageBucket: Cypress.env('FIREBASE_STORAGE_BUCKET') as string,
  messagingSenderId: Cypress.env('FIREBASE_MESSAGING_SENDER_ID') as string,
  appId: Cypress.env('FIREBASE_APP_ID') as string,
  measurementId: Cypress.env('FIREBASE_MEASUREMENT_ID') as string,
};

if (!firebase.apps.length) firebase.initializeApp(clientCredentials);

function loginWithToken(token: string): Promise<null> {
  return new Promise((resolve, reject): void => {
    firebase.auth().onAuthStateChanged((auth: unknown): void => {
      if (auth) resolve(null);
    });
    firebase.auth().signInWithCustomToken(token).catch(reject);
  });
}

Cypress.Commands.add(
  'login',
  (uid?: string): Cypress.Chainable<null> => {
    if (firebase.auth().currentUser) throw new Error('User already logged in.');
    return cy.task('login', uid).then((token: unknown) => {
      return loginWithToken(token as string);
    });
  }
);