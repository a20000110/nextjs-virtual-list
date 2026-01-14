"use client";

import React, { useMemo } from "react";
import VirtualList from "@/components/VirtualList";
import { generateMockData } from "@/utils/mock";
import { ExampleItem } from "@/components/ExampleItem";

export default function VariableHeightPage() {
  const data = useMemo(() => generateMockData(1000), []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Variable Height Virtual List</h1>
      <p>This list has a fixed container height of 600px but items have variable heights based on content.</p>
      <div style={{ border: "1px solid #ccc", marginTop: "20px" }}>
        <VirtualList
          data={data}
          dataKey="id"
          item={ExampleItem}
          keeps={20}
          size={150} // Estimate size
          height={600}
        />
      </div>
    </div>
  );
}
