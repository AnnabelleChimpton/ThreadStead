import Link from 'next/link';

export default function TestNav() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Navigation Test Page</h1>
      <p>This is a minimal test page to check if navigation works</p>
      <div style={{ display: 'flex', gap: '20px', margin: '20px 0' }}>
        <Link href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
          Home
        </Link>
        <Link href="/feed" style={{ color: 'blue', textDecoration: 'underline' }}>
          Feed
        </Link>
        <Link href="/directory" style={{ color: 'blue', textDecoration: 'underline' }}>
          Directory
        </Link>
      </div>
    </div>
  );
}