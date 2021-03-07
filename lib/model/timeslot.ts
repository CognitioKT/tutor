import * as admin from 'firebase-admin';

import { isDateJSON, isJSON } from 'lib/model/json';
import clone from 'lib/utils/clone';
import construct from 'lib/model/construct';
import definedVals from 'lib/model/defined-vals';

/**
 * This is a painful workaround as we then import the entire Firebase library
 * definition while we only want the `Timestamp` object.
 * @todo Only import the `Timestamp` definition.
 * @todo Add support for the server-side `Timestamp` definition as well; right
 * now, we're not even using these type definitions because the Firebase Admin
 * SDK is telling us that the client-side and server-side type definitions are
 * incompatible.
 * @see {@link https://stackoverflow.com/a/57984831/10023158}
 */
type Timestamp = admin.firestore.Timestamp;

/**
 * A timeslot is a window of time and provides all the necessary scheduling data
 * for any scenario (including support for complex rrules used server-side).
 * @typedef {Object} TimeslotInterface
 * @property id - A unique identifier for this timeslot (used as React keys and
 * thus only stored client-side as we have no use for this on our server).
 * @property from - The start time of this particular timeslot instance.
 * @property to - The end time of this particular timeslot instance.
 * @property [recur] - The timeslot's recurrence rule (as an iCal RFC string).
 * @property [last] - The timeslot's last possible end time. Undefined
 * client-side; only used server-side for querying recurring timeslots.
 */
export interface TimeslotInterface<T = Date> {
  id: string;
  from: T;
  to: T;
  recur?: string;
  last?: T;
}

export type TimeslotFirestore = TimeslotInterface<Timestamp>;
export type TimeslotJSON = TimeslotInterface<string>;
export type TimeslotSearchHit = TimeslotInterface<number>;
export type TimeslotSegment = { from: Date; to: Date };

export function isTimeslotJSON(json: unknown): json is TimeslotJSON {
  if (!isJSON(json)) return false;
  if (typeof json.id !== 'string') return false;
  if (!isDateJSON(json.from)) return false;
  if (!isDateJSON(json.to)) return false;
  if (json.recur && typeof json.recur !== 'string') return false;
  if (json.last && !isDateJSON(json.last)) return false;
  return true;
}

export class Timeslot implements TimeslotInterface {
  public id = '';

  public from: Date = new Date();

  public to: Date = new Date();

  public recur?: string;

  public last?: Date;

  /**
   * Constructor that takes advantage of Typescript's shorthand assignment.
   * @see {@link https://bit.ly/2XjNmB5}
   */
  public constructor(timeslot: Partial<TimeslotInterface> = {}) {
    construct<TimeslotInterface>(this, timeslot);
  }

  public get clone(): Timeslot {
    return new Timeslot(clone(this));
  }

  /**
   * @return The duration of this timeslot in milliseconds.
   */
  public get duration(): number {
    return this.to.valueOf() - this.from.valueOf();
  }

  /**
   * @return Whether or not this timeslot overlaps with the given timeslot:
   * 1. (Contained) Timeslot contains the given timeslot, OR;
   * 2. (Overlap Start) Timeslot contains the given timeslot's start time, OR;
   * 3. (Overlap End) Timeslot contains the given timeslot's end time.
   * @todo Why can't we use this in the calendar positioning logic?
   */
  public overlaps(other: { from: Date; to: Date }): boolean {
    return (
      this.contains(other) ||
      this.contains({ from: other.from, to: other.from }) ||
      this.contains({ from: other.to, to: other.to })
    );
  }

  /**
   * Returns whether or not this timeslot contains the given timeslot.
   * @param other - The timeslot to check is within this timeslot.
   * @return Whether the starting time of this timeslot is before the starting
   * time of the other timeslot AND the ending time of this timeslot is after
   * the ending time of the other timeslot.
   */
  public contains(other: { from: Date; to: Date }): boolean {
    return (
      this.from.valueOf() <= other.from.valueOf() &&
      this.from.valueOf() + this.duration >= other.to.valueOf()
    );
  }

  /**
   * Returns whether or not this timeslot is equal to another.
   * @param other - The timeslot to check is equal to this one.
   * @return Whether the other timeslot is equal to this one.
   * @deprecated Just use a `dequal` instead.
   */
  public equalTo(other: TimeslotInterface): boolean {
    return (
      other.to.valueOf() === this.to.valueOf() &&
      other.from.valueOf() === this.from.valueOf()
    );
  }

  public toNextWeek(): Timeslot {
    const from = new Date(this.from.valueOf());
    const to = new Date(this.to.valueOf());
    from.setDate(from.getDate() + 7);
    to.setDate(to.getDate() + 7);
    return new Timeslot({ ...this, from, to });
  }

  public toString(locale = 'en', showTimeZone = true): string {
    const showSecondDate =
      this.from.getDate() !== this.to.getDate() ||
      this.from.getMonth() !== this.to.getMonth() ||
      this.from.getFullYear() !== this.to.getFullYear();
    return `${this.from.toLocaleString(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    })} - ${this.to.toLocaleString(locale, {
      weekday: showSecondDate ? 'long' : undefined,
      month: showSecondDate ? 'long' : undefined,
      day: showSecondDate ? 'numeric' : undefined,
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: showTimeZone ? 'short' : undefined,
    })}`;
  }

  public toFirestore(): TimeslotFirestore {
    const { from, to, last, ...rest } = this;
    return definedVals({
      ...rest,
      from: (from as unknown) as Timestamp,
      to: (to as unknown) as Timestamp,
      last: last ? ((last as unknown) as Timestamp) : undefined,
    });
  }

  public static fromFirestore(data: TimeslotFirestore): Timeslot {
    return new Timeslot({
      ...data,
      from: data.from.toDate(),
      to: data.to.toDate(),
      last: data.last?.toDate(),
    });
  }

  public toJSON(): TimeslotJSON {
    const { from, to, last, ...rest } = this;
    return definedVals({
      ...rest,
      from: from.toJSON(),
      to: to.toJSON(),
      last: last?.toJSON(),
    });
  }

  public static fromJSON(json: TimeslotJSON): Timeslot {
    return new Timeslot({
      ...json,
      from: new Date(json.from),
      to: new Date(json.to),
      last: json.last ? new Date(json.last) : undefined,
    });
  }

  public toSearchHit(): TimeslotSearchHit {
    const { from, to, last, ...rest } = this;
    return definedVals({
      ...rest,
      from: from.valueOf(),
      to: to.valueOf(),
      last: last?.valueOf(),
    });
  }

  public static fromSearchHit(hit: TimeslotSearchHit): Timeslot {
    return new Timeslot({
      ...hit,
      from: new Date(hit.from),
      to: new Date(hit.to),
      last: hit.last ? new Date(hit.last) : undefined,
    });
  }

  public toURLParam(): string {
    return encodeURIComponent(JSON.stringify(this));
  }

  public static fromURLParam(param: string): Timeslot {
    const params: URLSearchParams = new URLSearchParams(param);
    return new Timeslot({
      id: params.get('id') || undefined,
      from: new Date(params.get('from') as string),
      to: new Date(params.get('to') as string),
      recur: params.get('recur') || undefined,
      last: params.get('last')
        ? new Date(params.get('last') as string)
        : undefined,
    });
  }

  public toSegment(): TimeslotSegment {
    return { from: this.from, to: this.to };
  }
}
