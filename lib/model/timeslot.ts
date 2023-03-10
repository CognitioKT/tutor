import { isArray, isDateJSON, isJSON } from 'lib/model/json';
import clone from 'lib/utils/clone';
import construct from 'lib/model/construct';
import definedVals from 'lib/model/defined-vals';

/**
 * A timeslot is a window of time and provides all the necessary scheduling data
 * for any scenario (including support for complex rrules used server-side).
 * @typedef {Object} TimeslotInterface
 * @property id - A unique identifier for this timeslot (used as React keys and
 * thus only stored client-side as we have no use for this on our server).
 * @property from - The start time of this particular timeslot instance.
 * @property to - The end time of this particular timeslot instance.
 * @property [exdates] - Dates to exclude from the timeslot's recurrence rule.
 * @property [recur] - The timeslot's recurrence rule (as an iCal RFC string).
 * @property [last] - The timeslot's last possible end time. Undefined
 * client-side; only used server-side for querying recurring timeslots.
 */
export interface TimeslotInterface<T = Date> {
  id: string;
  from: T;
  to: T;
  exdates?: T[];
  recur?: string;
  last?: T;
}

export type DBDate = string;
export interface DBTimeslot {
  id: string;
  from: DBDate;
  to: DBDate;
  exdates: DBDate[] | null;
  recur: DBDate | null;
  last: DBDate | null;
}

export type TimeslotJSON = TimeslotInterface<string>;
export type TimeslotSegment = { from: Date; to: Date };

export function isTimeslotJSON(json: unknown): json is TimeslotJSON {
  if (!isJSON(json)) return false;
  if (typeof json.id !== 'string') return false;
  if (!isDateJSON(json.from)) return false;
  if (!isDateJSON(json.to)) return false;
  if (json.recur && typeof json.recur !== 'string') return false;
  if (json.exdates && !isArray(json.exdates, isDateJSON)) return false;
  if (json.last && !isDateJSON(json.last)) return false;
  return true;
}

export class Timeslot implements TimeslotInterface {
  public id = '';

  public from: Date = new Date();

  public to: Date = new Date();

  public exdates?: Date[];

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
   * @param other - The timeslot to check if it's overlapping with this one.
   * @param [allowBackToBack] - If true, this will allow the timeslots to touch
   * (but not overlap). Defaults to false.
   * @return Whether or not this timeslot overlaps with the given timeslot.
   */
  public overlaps(
    other: { from: Date; to: Date },
    allowBackToBack: boolean = false
  ): boolean {
    if (allowBackToBack) return this.to > other.from && this.from < other.to;
    return this.to >= other.from && this.from <= other.to;
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

  public toString(
    locale = 'en',
    timeZone = 'America/Los_Angeles',
    showTimeZone = true,
    showTimeOnly = false 
  ): string {
    const hideAMPM =
      (this.from.getHours() >= 12 && this.to.getHours() >= 12) ||
      (this.from.getHours() < 12 && this.to.getHours() < 12);
    const showYear = this.from.getFullYear() !== new Date().getFullYear();
    const showSecondDate =
      this.from.getDate() !== this.to.getDate() ||
      this.from.getMonth() !== this.to.getMonth() ||
      this.from.getFullYear() !== this.to.getFullYear();

    // We follow Google's Material Design guidelines while formatting these
    // durations. We use an en dash without spaces between the time range.
    // @see {@link https://material.io/design/communication/data-formats.html}
    return `${this.from
      .toLocaleString(locale, {
        timeZone: timeZone || 'America/Los_Angeles',
        year: showYear && !showTimeOnly ? 'numeric' : undefined,
        weekday: !showTimeOnly ? 'long' : undefined,
        month: !showTimeOnly ? 'long' : undefined,
        day: !showTimeOnly ? 'numeric' : undefined,
        hour: 'numeric',
        minute: 'numeric',
      })
      .replace(hideAMPM && !showSecondDate ? ' AM' : '', '')
      .replace(
        hideAMPM && !showSecondDate ? ' PM' : '',
        ''
      )}???${this.to.toLocaleString(locale, {
      timeZone: timeZone || 'America/Los_Angeles',
      year: showSecondDate && showYear && !showTimeOnly ? 'numeric' : undefined,
      weekday: showSecondDate && !showTimeOnly ? 'long' : undefined,
      month: showSecondDate && !showTimeOnly ? 'long' : undefined,
      day: showSecondDate && !showTimeOnly ? 'numeric' : undefined,
      hour: 'numeric',
      minute: 'numeric',
      timeZoneName: showTimeZone ? 'short' : undefined,
    })}`;
  }

  public toDB(): DBTimeslot {
    return {
      id: this.id,
      from: this.from.toISOString(),
      to: this.to.toISOString(),
      exdates: this.exdates?.map((d) => d.toISOString()) || null,
      recur: this.recur || null,
      last: this.last?.toISOString() || null,
    };
  }

  public static fromDB(record: DBTimeslot): Timeslot {
    return new Timeslot({
      id: record.id,
      from: new Date(record.from),
      to: new Date(record.to),
      exdates: record.exdates?.map((d) => new Date(d)) || undefined,
      recur: record.recur || undefined,
      last: record.last ? new Date(record.last) : undefined,
    });
  }

  public toJSON(): TimeslotJSON {
    const { from, to, exdates, last, ...rest } = this;
    return definedVals({
      ...rest,
      from: from.toJSON(),
      to: to.toJSON(),
      exdates: exdates?.map((d) => d.toJSON()),
      last: last?.toJSON(),
    });
  }

  public static fromJSON(json: TimeslotJSON): Timeslot {
    return new Timeslot({
      ...json,
      from: new Date(json.from),
      to: new Date(json.to),
      exdates: json.exdates?.map((d) => new Date(d)),
      last: json.last ? new Date(json.last) : undefined,
    });
  }

  public toURLParam(): string {
    return encodeURIComponent(JSON.stringify(this));
  }

  // TODO: Add exdate, recur, and last support to this if needed.
  public static fromURLParam(param: string): Timeslot {
    const params: URLSearchParams = new URLSearchParams(param);
    return new Timeslot({
      id: params.get('id') || undefined,
      from: new Date(params.get('from') as string),
      to: new Date(params.get('to') as string),
    });
  }

  public toSegment(): TimeslotSegment {
    return { from: this.from, to: this.to };
  }
}
