/**
 * What people call a component, for the ones whose names they wouldn't
 * guess (lowercase, no dashes or underscores). The compiler suggests these
 * for an unknown tag (<Top8 /> → FriendDisplay), and the editor's
 * autocomplete offers them as you type (<top → FriendDisplay).
 */
export const COMPONENT_NICKNAMES: Record<string, string> = {
  top8: 'FriendDisplay', topfriends: 'FriendDisplay', friends: 'FriendDisplay', friend: 'FriendDisplay',
  song: 'ProfileMusic', music: 'ProfileMusic', musicplayer: 'ProfileMusic',
  webring: 'RingNav', rings: 'MyRings', threadrings: 'MyRings',
  youtube: 'Embed', video: 'Embed', iframe: 'Embed', spotify: 'Embed', bandcamp: 'Embed',
  post: 'BlogPosts', posts: 'BlogPosts', blog: 'BlogPosts', blogpost: 'BlogPosts',
  photo: 'ProfilePhoto', avatar: 'ProfilePhoto', picture: 'ProfilePhoto',
  name: 'DisplayName', about: 'Bio', aboutme: 'Bio',
  house: 'MyHouse', home: 'MyHouse',
  spoiler: 'RevealBox', secret: 'RevealBox',
  note: 'StickyNote', polaroid: 'PolaroidFrame',
  counter: 'Increment', variable: 'Var',
};
