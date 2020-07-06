/**
 * Class that contains some useful `Date` manipulation and creation utilities.
 *
 * This is a Node.js copy of the class originally implemented in Typescript in
 * `src/utils/time.ts`. This copy exists merely for convenience of being
 * relatively executable (i.e. you can use this anywhere you have a Node.js
 * runtime).
 *
 * For an authoritative copy, please refer to the original Typescript
 * implementation in `src/utils/time.ts`.
 */
module.exports = class TimeUtils {
  /**
   * Returns the next date from 1970-01-01T00:00:00Z (the origin of the Unix
   * timestamp) that has the given times.
   * @see {@link https://en.wikipedia.org/wiki/Unix_time}
   * @param hours - The hours that the returned date should have.
   * @param [minutes=0] - The minutes that the returned date should have.
   * @param [seconds=0] - The seconds that the returned date should have.
   * @param [milliseconds=0] - The milliseconds that the returned date should
   * have.
   */
  static getDateWithTime(hours, minutes = 0, seconds = 0, milliseconds = 0) {
    return TimeUtils.getNextDateWithTime(
      hours,
      minutes,
      seconds,
      milliseconds,
      new Date('1970-01-01T00:00:00Z')
    );
  }

  /**
   * Returns the next date (from now or from a given date) that has the given
   * times.
   * @param hours - The hours that the returned date should have.
   * @param minutes - The minutes that the returned date should have.
   * @param seconds - The seconds that the returned date should have.
   * @param milliseconds - The milliseconds that the returned date should have.
   * @param [now] - The date we should start from. Default is right now.
   */
  static getNextDateWithTime(
    hours,
    minutes,
    seconds,
    milliseconds,
    now = new Date()
  ) {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      seconds,
      milliseconds
    );
  }

  /**
   * Returns the next date (from a given date) that has the given day (does not
   * change the times on the given date).
   * @param day - The integer representing the desired day (e.g. 0 for Sunday).
   * @param [now] - The starting point and the date to get the time values
   * from (i.e. the hours, minutes, seconds, milliseconds, year, month, etc).
   * Default is right now.
   * @todo Why do we have a counter (originally from `@tutorboook/utils`)?
   */
  static getNextDateWithDay(day, now = new Date()) {
    const date = new Date(now.valueOf());
    let count = 0; // TODO: Why did we add this counter in `@tutorbook/utils`?
    while (date.getDay() !== day && count <= 256) {
      date.setDate(date.getDate() + 1);
      count++;
    }
    return date;
  }

  /**
   * Helper function that combines `getDateWithTime` and `getNextDateWithDay` to
   * produce a function that returns a `Date` representing a weekly recurring
   * timestamp (i.e. the first occurance of the desired time as a Unix time).
   */
  static getDate(day, hours, minutes = 0, seconds = 0, milliseconds = 0) {
    const time = TimeUtils.getDateWithTime(
      hours,
      minutes,
      seconds,
      milliseconds
    );
    return TimeUtils.getNextDateWithDay(day, time);
  }
};
