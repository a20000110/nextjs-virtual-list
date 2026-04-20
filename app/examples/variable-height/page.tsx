"use client";

import { useMemo, type ComponentType } from "react";
import VirtualList from "@/components/VirtualList";
import { generateMockData, type FeedItem } from "@/utils/mock";
import { ExampleItem } from "@/components/ExampleItem";

type VirtualListData = Record<string, unknown>;
type VirtualListItemProps = Record<string, unknown>;

export default function VariableHeightPage() {
  const data = useMemo<FeedItem[]>(() => generateMockData(1000), []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Variable Height Virtual List</h1>
      <p>This list has a fixed container height of 600px but items have variable heights based on content.</p>
      <div style={{ border: "1px solid #ccc", marginTop: "20px" }}>
        <VirtualList
          data={data as unknown as VirtualListData[]}
          dataKey="id"
          item={ExampleItem as unknown as ComponentType<VirtualListItemProps>}
          keeps={20}
          size={150} // Estimate size
          height={600}
        />
      </div>
    </div>
  );
}
