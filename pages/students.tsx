import About from 'components/about';
import Hero from 'components/hero';
import Page from 'components/page';
import { TabHeader } from 'components/navigation';

import { withI18n } from 'lib/intl';

import about from 'locales/en/about.json';
import banner from 'locales/en/banner.json';
import common from 'locales/en/common.json';
import match3rd from 'locales/en/match3rd.json';
import query3rd from 'locales/en/query3rd.json';

function StudentsPage(): JSX.Element {
  return (
    <Page title='Support at scale - Tutorbook'>
      <TabHeader
        tabs={[
          {
            label: 'Organizations',
            href: '/',
          },
          {
            label: 'Students',
            active: true,
            href: '/students',
          },
          {
            label: 'Tutors',
            href: '/tutors',
          },
          {
            label: 'Mentors',
            href: '/mentors',
          },
        ]}
      />
      <Hero />
      <About />
      <div style={{ marginBottom: '60px' }}>
        <Hero />
      </div>
    </Page>
  );
}

export default withI18n(StudentsPage, {
  common,
  about,
  banner,
  query3rd,
  match3rd,
});
