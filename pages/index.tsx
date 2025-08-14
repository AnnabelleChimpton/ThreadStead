import Layout from "../components/Layout";
import Tabs, { TabSpec } from "../components/Tabs";
import Feed from "../components/Feed";

export default function Home() {
  const tabs: TabSpec[] = [
    {
      id: "recent",
      label: "Recent Posts",
      content: <Feed type="recent" />
    },
    {
      id: "active", 
      label: "Active Discussions",
      content: <Feed type="active" />
    }
  ];

  return (
    <Layout>
      <div className="thread-module p-6 mb-6">
        <div className="mb-4">
          <h1 className="thread-headline text-3xl font-bold mb-2">Welcome to ThreadStead</h1>
          <p className="text-thread-sage leading-relaxed">
            A cozy corner of the web where your threads belong to you. 
            Discover what your neighbors are sharing and join the conversation.
          </p>
        </div>
        <div className="thread-divider"></div>
        <div className="mt-6">
          <span className="thread-label">community feed</span>
        </div>
      </div>

      <Tabs tabs={tabs} initialId="recent" />
    </Layout>
  );
}
