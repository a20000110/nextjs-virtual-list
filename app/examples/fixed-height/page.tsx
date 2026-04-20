"use client";

import { useMemo, type ComponentType } from "react";
import VirtualList from "@/components/VirtualList";
import { generateMockData, FeedItem } from "@/components/VirtualList/mock";
import { ExampleItem } from "@/components/VirtualList/ExampleItem";

type VirtualListData = Record<string, unknown>;
type VirtualListItemProps = Record<string, unknown>;
type FixedItemProps = { source: FeedItem; index: number };

export default function FixedHeightPage() {
  const data = useMemo<FeedItem[]>(() => generateMockData(1000), []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Fixed Height Virtual List</h1>
      <p>This list has a fixed container height of 600px and fixed item height.</p>
      <div style={{ border: "1px solid #ccc", marginTop: "20px" }}>
        <VirtualList
          data={data as unknown as VirtualListData[]}
          dataKey="id"
          item={((props: VirtualListItemProps) => {
            const typedProps: FixedItemProps = props as unknown as FixedItemProps;
            return <ExampleItem {...typedProps} fixedHeight={true} />;
          }) as ComponentType<VirtualListItemProps>}
          keeps={20}
          size={100}
          height={600}
        />
      </div>
    </div>
  );
}
