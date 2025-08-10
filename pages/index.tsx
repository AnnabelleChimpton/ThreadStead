import Layout from "../components/Layout";

export default function Home() {
  return (
    <Layout>
      <div className="border border-black bg-white p-4 shadow-[4px_4px_0_#000]">
        <h2 className="text-xl font-bold mb-2">Global Feed</h2>
        <p>Welcome to Retro Social — where the old internet spirit lives on!</p>
      </div>
    </Layout>
  );
}
