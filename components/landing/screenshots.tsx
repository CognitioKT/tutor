import { useState } from 'react';

import Tabs from 'components/navigation/tabs';
import Browser from 'components/browser';

import styles from './screenshots.module.scss';

interface Preview {
  label: string;
  id: string;
  url: string;
}

const previews = [
  {
    label: 'Landing pages',
    id: 'landing',
    url: '/default',
  },
  {
    label: 'Profile forms',
    id: 'profile',
    url: '/default/signup',
  },
  {
    label: 'Search views',
    id: 'search',
    url: '/default/search',
  },
  {
    label: 'Match scheduling',
    id: 'scheduling',
    url: '/default/search/volunteer',
  },
];

export default function Screenshots(): JSX.Element {
  const [active, setActive] = useState<Preview>(previews[0]);

  return (
    <div className={styles.features}>
      <div className={styles.wrapper}>
        <div className={styles.tabs}>
          <Tabs
            tabs={previews.map((preview) => ({
              label: preview.label,
              onClick: () => setActive(preview),
              active: active.id === preview.id,
            }))}
          />
        </div>
        <div className={styles.window}>
          <Browser title={active.label} url={active.url} />
        </div>
        <div className={styles.orgs}>
          <span className={styles.org}>PAUSD</span>
          <span className={styles.org}>QuaranTunes</span>
          <span className={styles.org}>EPATT</span>
          <span className={styles.org}>TopDogTutors</span>
        </div>
      </div>
    </div>
  );
}
