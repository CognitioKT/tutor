import {
  Button,
  Email,
  Footer,
  Header,
  Item,
  Link,
  MeetingDisplay,
  P,
} from 'lib/mail/components';
import { Meeting, Org, User } from 'lib/model';

export interface OrgDirectMeetingEmailProps {
  org: Org;
  meeting: Meeting;
  recipient: User;
  creator: User;
}

export default function OrgDirectMeetingEmail({
  org,
  meeting,
  recipient,
  creator,
}: OrgDirectMeetingEmailProps): JSX.Element {
  const calendarURL = `https://tutorbook.app/${org.id}/calendar`;
  const isTutoring = recipient.roles.includes('tutor');

  return (
    <Email>
      <Header />
      <Item left='48px' right='48px'>
        <P style={{ marginTop: '0px !important' }}>Hi {org.name} admins,</P>
        <P>
          {creator.name} just scheduled a new{' '}
          {isTutoring ? 'tutoring lesson' : 'mentoring meeting'} with{' '}
          {recipient.name}:
        </P>
        <MeetingDisplay
          meeting={meeting}
          people={[recipient, creator]}
          creator={creator}
        />
        <br />
        <P>
          To view and edit {org.name}&apos;s{' '}
          {isTutoring ? 'lessons' : 'meetings'}, simply click the button below:
        </P>
        <br />
        <Button href={calendarURL}>VIEW CALENDAR</Button>
        <br />
        <P>Or copy and paste this URL into a new tab of your browser:</P>
        <P style={{ marginBottom: '0px !important' }}>
          <Link href={calendarURL}>{calendarURL}</Link>
        </P>
        <br />
        <P style={{ marginBottom: '0px !important' }}>Thank you.</P>
      </Item>
      <Footer>
        <P style={{ marginBottom: '0px !important' }}>
          If this message contains spam or unwanted messages let us know at{' '}
          <Link href='mailto:team@tutorbook.org'>team@tutorbook.org</Link>.
        </P>
      </Footer>
    </Email>
  );
}