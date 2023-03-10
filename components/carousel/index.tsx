import useSWR, { mutate } from 'swr';
import { nanoid } from 'nanoid';
import { useEffect } from 'react';

import { User, UserJSON } from 'lib/model/user';
import { UsersQuery } from 'lib/model/query/users';
import { ListUsersRes } from 'lib/api/routes/users/list';
import { useOrg } from 'lib/context/org';

import { LoadingCard, UserCard } from './cards';
import Carousel from './carousel';

interface Props {
  query: UsersQuery;
  onClick?: (user: User) => void;
}

export default function UserCarousel({ query, onClick }: Props): JSX.Element {
  const { data } = useSWR<ListUsersRes>(query.endpoint);
  const { org } = useOrg();

  useEffect(() => {
    void mutate(query.endpoint);
  }, [query.endpoint]);

  return (
    <>
      {data && (
        <Carousel>
          {data.users
            .map((u: UserJSON) => User.fromJSON(u))
            .map((user: User) => (
              <UserCard
                key={user.id}
                user={user}
                onClick={onClick ? () => onClick(user) : undefined}
                href={
                  !onClick
                    ? `/${org?.id || 'default'}/users/${user.id}`
                    : undefined
                }
              />
            ))}
        </Carousel>
      )}
      {!data && (
        <Carousel>
          {Array(6)
            .fill(null)
            .map(() => (
              <LoadingCard key={nanoid()} />
            ))}
        </Carousel>
      )}
    </>
  );
}
