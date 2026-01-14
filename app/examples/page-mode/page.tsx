"use client";

import React, { useMemo } from "react";
import VirtualList from "@/components/VirtualList";
import { generateMockData } from "@/utils/mock";
import { ExampleItem } from "@/components/ExampleItem";

export default function PageModePage() {
  const data = useMemo(() => generateMockData(1000), []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Page Mode Virtual List</h1>
      <p>This list uses the window scrollbar (pageMode=true).</p>
      <p style={{ marginBottom: "20px" }}>Scroll down to see the virtual list in action.</p>
      <VirtualList
        data={data}
        dataKey="id"
        item={ExampleItem}
        keeps={20}
        size={150} // Estimate size
        pageMode={true}
      />
    </div>
  );
}
