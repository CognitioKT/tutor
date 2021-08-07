import {
  DBDate,
  DBTimeslot,
  Timeslot,
  TimeslotJSON,
  isTimeslotJSON,
} from 'lib/model/timeslot';
import { DBPerson, Role, User, UserJSON, isUserJSON } from 'lib/model/user';
import {
  Resource,
  ResourceInterface,
  ResourceJSON,
  isResourceJSON,
} from 'lib/model/resource';
import { Venue, VenueJSON, isVenueJSON } from 'lib/model/venue';
import { isArray, isJSON, isStringArray } from 'lib/model/json';
import { join, notTags } from 'lib/utils';
import { Aspect } from 'lib/model/aspect';
import clone from 'lib/utils/clone';
import construct from 'lib/model/construct';
import definedVals from 'lib/model/defined-vals';

export type MeetingTag = 'recurring'; // Meeting is recurring (has rrule).

export type DBMeetingTag = MeetingTag | 'not-recurring';

export const MEETING_TAGS: MeetingTag[] = ['recurring'];

export function isMeetingTag(tag: unknown): tag is MeetingTag {
  return tag === 'recurring';
}

/**
 * @typedef MeetingAction
 * @description Action to take when updating recurring meetings.
 * @property all - Update all of the recurring meetings.
 * @property future - Update this and all future meetings.
 * @property this - Only update this meeting instance.
 */
export type MeetingAction = 'all' | 'future' | 'this';

/**
 * A meeting is a past appointment logged for a match (e.g. John and Jane met
 * last week for 30 mins on Tuesday 3:00 - 3:30 PM).
 * @typedef {Object} Meeting
 * @extends Resource
 * @property creator - The person who created this meeting.
 * @property match - This meeting's match.
 * @property venue - Link to the meeting venue (e.g. Zoom or Jitsi).
 * @property time - Time of the meeting (e.g. Tuesday 3:00 - 3:30 PM).
 * @property creator - The person who logged the meeting (typically the tutor).
 * @property description - Notes about the meeting (e.g. what they worked on).
 * @property [parentId] - The recurring parent meeting ID (if any).
 */
export interface MeetingInterface extends ResourceInterface {
  id: number;
  tags: MeetingTag[];
  org: string;
  subjects: string[];
  people: User[];
  creator: User;
  description: string;
  venue: Venue;
  time: Timeslot;
  match: number;
  parentId?: number;
}

export type MeetingJSON = Omit<
  MeetingInterface,
  keyof Resource | 'time' | 'venue' | 'creator'
> &
  ResourceJSON & {
    time: TimeslotJSON;
    venue: VenueJSON;
    creator: UserJSON;
  };

export function isMeetingJSON(json: unknown): json is MeetingJSON {
  if (!isResourceJSON(json)) return false;
  if (!isJSON(json)) return false;
  if (typeof json.id !== 'number') return false;
  if (!isArray(json.tags, isMeetingTag)) return false;
  if (typeof json.org !== 'string') return false;
  if (!isStringArray(json.subjects)) return false;
  if (!isArray(json.people, isUserJSON)) return false;
  if (!isUserJSON(json.creator)) return false;
  if (typeof json.description !== 'string') return false;
  if (!isVenueJSON(json.venue)) return false;
  if (!isTimeslotJSON(json.time)) return false;
  if (typeof json.match !== 'number') return false;
  if (json.parentId && typeof json.parentId !== 'number') return false;
  return true;
}

export interface DBMeeting {
  id: number;
  tags: DBMeetingTag[];
  org: string;
  subjects: string[];
  creator: string;
  description: string;
  venue: string;
  time: DBTimeslot;
  match: number;
  created: DBDate;
  updated: DBDate;
}
export interface DBViewMeeting extends DBMeeting {
  people: DBPerson[] | null;
  people_ids: string[];
}
export interface DBRelationMeetingPerson {
  user: string;
  meeting: number;
  roles: Role[];
}

export interface MeetingSegment {
  id: number;
  description: string;
  subjects: string[];
  start: Date;
  end: Date;
}

export class Meeting extends Resource implements MeetingInterface {
  public id = 0;

  public tags: MeetingTag[] = [];

  public org = 'default';

  public subjects: string[] = [];

  public people: User[] = [];

  public creator: User = new User();

  public description = '';

  public venue = new Venue();

  public time = new Timeslot();

  public match = 0;

  public parentId?: number;

  public constructor(meeting: Partial<MeetingInterface> = {}) {
    super(meeting);
    construct<MeetingInterface, ResourceInterface>(
      this,
      meeting,
      new Resource()
    );
  }

  public get clone(): Meeting {
    return new Meeting(clone(this));
  }

  public get aspect(): Aspect {
    const isTutor = (a: User) => a.roles.indexOf('tutor') >= 0;
    const isTutee = (a: User) => a.roles.indexOf('tutee') >= 0;
    if (this.people.some((a) => isTutor(a) || isTutee(a))) return 'tutoring';
    return 'mentoring';
  }

  public get volunteer(): User | undefined {
    return this.people.find(
      (p) => p.roles.includes('tutor') || p.roles.includes('mentor')
    );
  }

  public get student(): User | undefined {
    return this.people.find(
      (p) => p.roles.includes('tutee') || p.roles.includes('mentee')
    );
  }

  public toString(): string {
    return `Meeting on ${this.time.toString()}`;
  }

  public toDB(): DBMeeting {
    return {
      id: this.id,
      org: this.org,
      creator: this.creator.id,
      subjects: this.subjects,
      match: this.match,
      venue: this.venue.url,
      time: this.time.toDB(),
      description: this.description,
      tags: [...this.tags, ...notTags(this.tags, MEETING_TAGS)],
      created: this.created.toISOString(),
      updated: this.updated.toISOString(),
    };
  }

  public static fromDB(record: DBMeeting | DBViewMeeting): Meeting {
    const creator =
      'people' in record
        ? (record.people || []).find((p) => p.id === record.creator)
        : undefined;
    const people =
      'people' in record
        ? (record.people || []).map((p) => User.fromDB(p))
        : [];
    return new Meeting({
      people,
      id: record.id,
      org: record.org,
      subjects: record.subjects,
      creator: creator
        ? User.fromDB(creator)
        : new User({ id: record.creator }),
      venue: new Venue({ url: record.venue }),
      time: Timeslot.fromDB(record.time),
      description: record.description,
      tags: record.tags.filter(isMeetingTag),
      created: new Date(record.created),
      updated: new Date(record.updated),
      match: record.match,
    });
  }

  public toJSON(): MeetingJSON {
    return definedVals({
      ...this,
      ...super.toJSON(),
      time: this.time.toJSON(),
      venue: this.venue.toJSON(),
      creator: this.creator.toJSON(),
    });
  }

  public static fromJSON(json: MeetingJSON): Meeting {
    return new Meeting({
      ...json,
      ...Resource.fromJSON(json),
      time: Timeslot.fromJSON(json.time),
      venue: Venue.fromJSON(json.venue),
      creator: User.fromJSON(json.creator),
    });
  }

  public toCSV(): Record<string, string> {
    return {
      'Meeting ID': this.id.toString(),
      'Meeting Subjects': join(this.subjects),
      'Meeting Description': this.description,
      'Meeting Tags': join(this.tags),
      'Meeting Created': this.created.toString(),
      'Meeting Last Updated': this.updated.toString(),
      'Volunteer ID': this.volunteer?.id || '',
      'Volunteer Name': this.volunteer?.name || '',
      'Volunteer Photo URL': this.volunteer?.photo || '',
      'Student ID': this.student?.id || '',
      'Student Name': this.student?.name || '',
      'Student Photo URL': this.student?.photo || '',
      'Meeting Start': this.time.from.toString(),
      'Meeting End': this.time.to.toString(),
      'Match ID': this.match.toString(),
    };
  }

  public toSegment(): MeetingSegment {
    return {
      id: this.id,
      description: this.description,
      subjects: this.subjects,
      start: this.time.from,
      end: this.time.to,
    };
  }
}
