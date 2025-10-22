import Link from 'next/link';
import Layout from '@/components/ui/layout/Layout';
import Head from 'next/head';

export default function Custom404() {
  return (
    <Layout>
      <Head>
        <title>404 - Page Not Found</title>
      </Head>

      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="mb-6">
            <h1 className="text-6xl font-bold text-black mb-2">404</h1>
            <div className="text-xl font-bold text-gray-700">Page Not Found</div>
          </div>

          <p className="text-gray-600 mb-8 text-lg">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or never existed.
          </p>

          <Link
            href="/"
            className="inline-block px-6 py-3 bg-yellow-400 border-4 border-black font-bold text-black hover:bg-yellow-300 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </Layout>
  );
}
