"use client";

import { useMemo, type ComponentType } from "react";
import VirtualList from "@/components/VirtualList";
import { generateMockData, type FeedItem } from "@/components/VirtualList/mock";
import { ExampleItem } from "@/components/VirtualList/ExampleItem";

type VirtualListData = Record<string, unknown>;
type VirtualListItemProps = Record<string, unknown>;

export default function PageModePage() {
  const data = useMemo<FeedItem[]>(() => generateMockData(1000), []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Page Mode Virtual List</h1>
      <p>This list uses the window scrollbar (pageMode=true).</p>
      <p style={{ marginBottom: "20px" }}>Scroll down to see the virtual list in action.</p>
      <VirtualList
        data={data as unknown as VirtualListData[]}
        dataKey="id"
        item={ExampleItem as unknown as ComponentType<VirtualListItemProps>}
        keeps={20}
        size={150} // Estimate size
        pageMode={true}
      />
    </div>
  );
}
