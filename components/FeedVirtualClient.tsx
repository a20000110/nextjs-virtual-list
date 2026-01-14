"use client";

import VirtualList, { VirtualListRef } from "@/components/VirtualList";
import { useEffect, useMemo, useRef, useState } from "react";
import { FeedItem } from "@/utils/mock";
import { ExampleItem } from "@/components/ExampleItem";

export default function FeedVirtualClient({
  data,
  keeps,
  headerSelectorId = "ssr-feed",
}: {
  data: FeedItem[];
  keeps: number;
  headerSelectorId?: string;
}) {
  const ref = useRef<VirtualListRef>(null);
  const [headerSize, setHeaderSize] = useState(0);
  const rest = useMemo(() => data.slice(keeps), [data, keeps]);

  useEffect(() => {
    const el = document.getElementById(headerSelectorId);
    const measure = () => {
      const e = document.getElementById(headerSelectorId);
      setHeaderSize(e ? e.offsetHeight : 0);
    };
    measure();
    const ro = el ? new ResizeObserver(measure) : null;
    ro?.observe(el!);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [headerSelectorId]);

  return (
    <VirtualList
      ref={ref}
      data={rest}
      dataKey="id"
      item={ExampleItem}
      keeps={keeps}
      size={100}
      pageMode
      headerSize={headerSize}
    />
  );
}
