# VirtualList with Dynamic Height

[中文文档](./README.zh-CN.md)

## Overview

- VirtualList is a virtual scrolling list component adapted for Next.js, supporting child items with variable heights (text, images, videos, comments, etc.).
- The component uses `ResizeObserver` to automatically measure the real height of each item and reuses the scrolling range calculation from `virtual.ts` to ensure performance and smooth scrolling.

## Implementation Details (Simplified)

- **Goal**: Render only a few items near the visible window and use padding to prop up the scroll height.
- **Core State**: `sizes` height map, `CalcType` calculation type, `Direction` scroll direction, `range` render window and padding.
- **Flow**:
  - Initialize the core instance and set parameters.
  - Child items report their height using `ResizeObserver`.
  - Save heights and switch calculation type (INIT→FIXED→DYNAMIC).
  - Set scroll direction and adjust the range based on buffer.
  - Update `range` and trigger component rendering.
  - Render items within the window based on `range`, and use front/back padding to maintain scroll height.
- **Key Algorithms**: Cumulative index offset, binary search for approximate scroll index, front/back padding calculation.
- **Usage Suggestions**: Set `keeps` to render about 2-3 screens in parallel, set `size` estimated height as close to real content as possible, pass `pageMode/headerSize` when combining with SSR first screen.

## Installation

```tsx
import VirtualList, { VirtualListRef } from "@/components/VirtualList";
```

## Props

- `data`: Data source array
- `dataKey`: Unique key (string field or function)
- `item`: Child item render component or render function
- `keeps`: Number of items to keep in the viewport, default 30
- `size`: Estimated item height (suggest 80~120 for dynamic height scenarios), default 50
- `start`/`offset`: Initial position (index or pixel offset)
- `topThreshold`/`bottomThreshold`: Top/Bottom trigger threshold
- `itemProps`: Additional props passed to child items
- `dataPropName`: Prop name for passing data to child items, default `source`
- `height`: List container height (`number | string`), the component internally uses itself as the scroll container
- `className`/`style`: Container style
- `pageMode`: Use window scrollbar (default false)
- `headerSize`: Height of the header (used with pageMode)
- Events: `onScroll`, `onToTop`, `onToBottom`, `onResized`, `onOk`

## Ref Methods

```ts
scrollToBottom(smooth?: boolean): void
getSizes(): number
getSize(id: string): number | undefined
getOffset(): number
getScrollSize(): number
getClientSize(): number
scrollToOffset(offset: number, smooth?: boolean): void
scrollToIndex(index: number, smooth?: boolean, topDistance?: number): void
```

## Key Points for Dynamic Height

- Child item heights are automatically reported by `ResizeObserver` after the first render and content changes, no manual calculation needed.
- Height changes after images, videos, etc., are loaded will trigger re-measurement and update the scroll range.
- `size` is an estimated height used for smooth experience before real height is measured, it is recommended to adjust it to a more reasonable estimated value based on actual content.
- The list itself should be a scroll container: pass a number or string (e.g., `600` or `"80vh"`) to `height`.

## Minimal Example (Variable Height, Mixed Text/Image/Video)

```tsx
"use client";
import { useMemo, useRef, useState } from "react";
import VirtualList, { VirtualListRef } from "@/components/VirtualList";
import DynamicImage from "@/components/DynamicImage";

type Comment = { id: string; user: string; avatar: string; text: string };
type MediaVideo = { src: string; poster?: string };
type FeedItem = {
  id: string;
  author: { name: string; avatar: string };
  createdAt: string;
  text: string;
  images: string[];
  video?: MediaVideo;
  likes: number;
  reposts: number;
  comments: Comment[];
};

function MediaGrid({ images }: { images: string[] }) {
  if (!images?.length) return null;
  const cols = images.length === 1 ? 1 : images.length <= 3 ? 2 : 3;
  return (
    <div
      className={`mt-3 grid gap-1 ${cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}
    >
      {images.map((src, idx) => (
        <div key={idx} className="overflow-hidden rounded-md border">
          <DynamicImage
            src={src}
            alt="img"
            width={400}
            height={400}
            className="h-auto w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function VideoBlock({ video }: { video?: MediaVideo }) {
  if (!video) return null;
  return (
    <div className="mt-2 overflow-hidden rounded">
      <video controls preload="metadata" poster={video.poster} className="w-full rounded">
        <source src={video.src} type="video/mp4" />
      </video>
    </div>
  );
}

function ItemComp(props: any) {
  const { source } = props as { source: FeedItem };
  const [showComments, setShowComments] = useState(false);
  return (
    <div className="border-b py-4">
      <div className="flex items-center gap-3">
        <DynamicImage
          src={source.author.avatar}
          alt={source.author.name}
          width={32}
          height={32}
          className="h-8 w-8 rounded-full"
        />
        <div>
          <div className="text-sm font-medium">{source.author.name}</div>
          <div className="text-xs text-gray-500">{source.createdAt}</div>
        </div>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm">{source.text}</div>
      {source.images.length ? <MediaGrid images={source.images} /> : null}
      {!source.images.length && source.video ? <VideoBlock video={source.video} /> : null}
      <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
        <button className="rounded px-2 py-1 hover:bg-gray-100">Like {source.likes}</button>
        <button className="rounded px-2 py-1 hover:bg-gray-100">Repost {source.reposts}</button>
        <button
          className="rounded px-2 py-1 hover:bg-gray-100"
          onClick={() => setShowComments((v) => !v)}
        >
          Comment {source.comments.length}
        </button>
      </div>
      {showComments ? (
        <div className="mt-2 space-y-2">
          {source.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <DynamicImage
                src={c.avatar}
                alt={c.user}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full"
              />
              <div className="text-xs">
                <div className="font-medium">{c.user}</div>
                <div className="text-gray-600">{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function makeFeed(count: number): FeedItem[] {
  // ... mock data generation ...
  return [];
}

export default function Page() {
  const ref = useRef<VirtualListRef>(null);
  const [data, setData] = useState<FeedItem[]>(() => makeFeed(1000));

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <VirtualList
        ref={ref}
        data={data}
        dataKey="id"
        item={ItemComp}
        keeps={60}
        size={100}
        height={800}
      />
    </div>
  );
}
```

## Notes

- Ensure `dataKey` generates a stable unique key that can be serialized to a string.
- Container scrolling must be handled by VirtualList itself: pass a fixed height or percentage/viewport height via `height`.
- Dynamic content loading (images/videos/comment expansion) automatically triggers size measurement, no manual call needed.
- If the estimated height differs too much from the real height, appropriately adjust `size` to improve scrolling experience.
