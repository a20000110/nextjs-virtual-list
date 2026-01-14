import { generateMockData, FeedItem } from "@/utils/mock";
import FeedVirtualClient from "@/components/FeedVirtualClient";
import { ExampleItem } from "@/components/ExampleItem";

export default async function SSRFeedPage() {
  const data: FeedItem[] = generateMockData(1000);
  const keeps = 60;
  const ssrItems = data.slice(0, keeps);

  return (
    <div className="w-full py-3">
      <div style={{ padding: "20px", borderBottom: "1px solid #ccc" }}>
        <h1>SSR Virtual List</h1>
        <p>The first {keeps} items are rendered on the server (SSR), and the rest are virtualized on the client.</p>
      </div>
      <section id="ssr-feed">
        {ssrItems.map((source, index) => (
          <ExampleItem key={source.id} source={source} index={index} />
        ))}
      </section>
      <FeedVirtualClient data={data} keeps={keeps} />
    </div>
  );
}
