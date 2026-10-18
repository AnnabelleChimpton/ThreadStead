// The feed lives at /feed. This old path still serves it instead of
// redirecting: production sent a permanent /feed → /discover/feed redirect,
// browsers cache those, and a redirect back would loop. The page's canonical
// link points at /feed.
export { default, getServerSideProps } from "../feed";
