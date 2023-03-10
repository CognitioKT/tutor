import Image from 'next/image';
import cn from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import Avatar from 'components/avatar';
import Button from 'components/button';

import { getEmailLink } from 'lib/utils';
import Link from 'lib/intl/link';
import { Org } from 'lib/model/org';

import styles from './home.module.scss';

export interface HomeProps {
  org?: Org;
}
export default function Home({ org }: HomeProps): JSX.Element {
  const { t, lang: locale } = useTranslation();

  return (
    <div data-cy='org-home' className={cn({ [styles.loading]: !org })}>
      {(!org || org.background) && (
        <div className={styles.background}>
          {org?.background && (
            <Image
              priority
              layout='fill'
              objectFit='cover'
              data-cy='backdrop'
              objectPosition='center 50%'
              src={org.background}
            />
          )}
        </div>
      )}
      <div className={styles.content}>
        <div className={styles.left}>
          <div className={styles.wrapper}>
            <a
              rel='noopener noreferrer'
              className={styles.img}
              href={org?.photo || ''}
              target='_blank'
              tabIndex={-1}
            >
              <Avatar size={120} loading={!org} src={org?.photo} priority />
            </a>
            <div>
              <h1 data-cy='name' className={styles.name}>
                {org && org.name}
              </h1>
              {(!org || !!org.socials.length) && (
                <div data-cy='socials' className={styles.socials}>
                  {(org ? org.socials : []).map((social) => (
                    <a
                      data-cy={`${social.type}-social-link`}
                      rel='noopener noreferrer'
                      key={social.type}
                      target='_blank'
                      href={social.url}
                      className={cn(styles.socialLink, styles[social.type])}
                    >
                      {social.type}
                    </a>
                  ))}
                  {!!org?.email && (
                    <a
                      data-cy='email-social-link'
                      rel='noopener noreferrer'
                      target='_blank'
                      href={getEmailLink(org)}
                      className={`${styles.socialLink} ${styles.email}`}
                    >
                      {org.email}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
          <h2>{org && 'About'}</h2>
          <p data-cy='bio'>{org && org.bio}</p>
          <p>{org && t('home:about', { name: org.name })}</p>
          <h2 data-cy='custom-header'>{org && org.home[locale].header}</h2>
          <p data-cy='custom-body'>{org && org.home[locale].body}</p>
        </div>
        <div className={styles.right}>
          <div className={styles.sticky}>
            <div className={styles.card}>
              <Link href={`/${org?.id || 'default'}/search`}>
                <a>
                  <Button
                    className={styles.btn}
                    label={t('home:search')}
                    raised
                    arrow
                  />
                </a>
              </Link>
              <Link href={`/${org?.id || 'default'}/signup`}>
                <a>
                  <Button
                    className={styles.btn}
                    label={t('home:signup')}
                    outlined
                    arrow
                  />
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
