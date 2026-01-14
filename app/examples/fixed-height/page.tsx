"use client";

import React, { useMemo } from "react";
import VirtualList from "@/components/VirtualList";
import { generateMockData, FeedItem } from "@/utils/mock";
import { ExampleItem } from "@/components/ExampleItem";

export default function FixedHeightPage() {
  const data = useMemo(() => generateMockData(1000), []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Fixed Height Virtual List</h1>
      <p>This list has a fixed container height of 600px and fixed item height.</p>
      <div style={{ border: "1px solid #ccc", marginTop: "20px" }}>
        <VirtualList
          data={data}
          dataKey="id"
          item={(props: { source: FeedItem; index: number }) => (
            <ExampleItem {...props} fixedHeight={true} />
          )}
          keeps={20}
          size={100}
          height={600}
        />
      </div>
    </div>
  );
}
