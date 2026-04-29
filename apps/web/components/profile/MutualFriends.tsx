import Image from 'next/image';

interface MutualFriend {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface MutualFriendsProps {
  count: number;
  sample: MutualFriend[];
}

export function MutualFriends({ count, sample }: MutualFriendsProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {sample.slice(0, 5).map((friend) => (
          <div
            key={friend.id}
            className="relative w-7 h-7 rounded-full border-2 border-white overflow-hidden bg-gray-200"
            title={friend.displayName}
          >
            {friend.avatarUrl ? (
              <Image
                src={friend.avatarUrl}
                alt={friend.displayName}
                fill
                className="object-cover"
                sizes="28px"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full text-xs font-medium text-gray-600">
                {friend.displayName[0]?.toUpperCase()}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-sm text-gray-500">
        {count === 1 ? '1 amigo em comum' : `${count} amigos em comum`}
      </p>
    </div>
  );
}
