import * as admin from 'firebase-admin';

import firebase from '@tutorbook/firebase';

import { AccountInterface, Account } from './account';

/**
 * Type aliases so that we don't have to type out the whole type. We could try
 * importing these directly from the `@firebase/firestore-types` or the
 * `@google-cloud/firestore` packages, but that's not recommended.
 * @todo Perhaps figure out a way to **only** import the type defs we need.
 */
type SnapshotOptions = firebase.firestore.SnapshotOptions;
type DocumentSnapshot = firebase.firestore.DocumentSnapshot;
type AdminDocumentSnapshot = admin.firestore.DocumentSnapshot;

/**
 * Duplicate definition from the `@tutorbook/react-intercom` package. These are
 * all the valid datatypes for custom Intercom user attributes.
 * @see {@link https://www.intercom.com/help/en/articles/179-send-custom-user-attributes-to-intercom}
 */
type IntercomCustomAttribute = string | boolean | number | Date;

/**
 * An `Org` object represents a non-profit organization that is using Tutorbook
 * to manage their virtual tutoring programs.
 * @typedef {Object} Org
 * @property members - An array of user UIDs that are members of this org.
 */
export interface OrgInterface extends AccountInterface {
  members: string[];
}

export type OrgJSON = OrgInterface;

export class Org extends Account implements OrgInterface {
  public members: string[] = [];

  public constructor(org: Partial<OrgInterface> = {}) {
    super(org);
    Object.entries(org).forEach(([key, val]: [string, any]) => {
      if (val && key in this && !(key in new Account()))
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
        (this as Record<string, any>)[key] = val;
    });
  }

  /**
   * Converts this `Org` object into a `Record<string, any>` that Intercom
   * can understand.
   * @see {@link https://developers.intercom.com/installing-intercom/docs/javascript-api-attributes-objects#section-data-attributes}
   */
  public toIntercom(): Record<string, IntercomCustomAttribute> {
    const { id, photo, ref, ...rest } = this;
    const isFilled: (val: any) => boolean = (val: any) => {
      switch (typeof val) {
        case 'string':
          return val !== '';
        case 'boolean':
          return true;
        case 'number':
          return true;
        case 'undefined':
          return false;
        case 'object':
          return Object.values(val).filter(isFilled).length > 0;
        default:
          return !!val;
      }
    };
    const isValid: (val: any) => boolean = (val: any) => {
      if (typeof val === 'string') return true;
      if (typeof val === 'boolean') return true;
      if (typeof val === 'number') return true;
      if (val instanceof Date) return true;
      return false;
    };
    const intercomValues: Record<string, any> = Object.fromEntries(
      Object.entries(rest)
        .filter(([key, val]) => isFilled(val))
        .map(([key, val]) => [key, isValid(val) ? val : JSON.stringify(val)])
    );
    return { ...intercomValues, ...super.toIntercom() };
  }

  public static fromFirestore(
    snapshot: DocumentSnapshot | AdminDocumentSnapshot,
    options?: SnapshotOptions
  ): Org {
    return new Org(Account.fromFirestore(snapshot, options));
  }

  public static fromJSON(json: OrgJSON): Org {
    return new Org(json);
  }

  public toJSON(): OrgJSON {
    return { ...this };
  }
}
