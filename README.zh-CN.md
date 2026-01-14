# VirtualList 不固定高度使用说明

## 概述

- VirtualList 是一个适配 Next 的虚拟滚动列表组件，支持不固定高度的子项内容（文本、图片、视频、评论等）。
- 组件通过 ResizeObserver 自动测量每个子项的真实高度，并复用 `virtual.ts` 的滚动范围计算，保证性能与流畅滚动。

## 实现思路（简版）

- 目标：仅渲染可视窗口附近的少量项，用前后占位填充撑起滚动高度。
- 核心状态：`sizes` 高度映射（src/components/VirtualList/virtual.ts:20）、`CalcType` 计算类型（src/components/VirtualList/virtual.ts:9-13）、`Direction` 滚动方向（src/components/VirtualList/virtual.ts:14-18）、`range` 渲染窗口与填充（src/components/VirtualList/virtual.ts:63-70）。
- 流程：
  - 初始化核心实例并设定参数（src/components/VirtualList/index.tsx:199-213）。
  - 子项用 ResizeObserver 上报高度（src/components/VirtualList/Item.tsx:52-70）。
  - 保存高度并切换计算类型（INIT→FIXED→DYNAMIC）（src/components/VirtualList/virtual.ts:104-116）。
  - 滚动设置方向并按缓冲调整范围（src/components/VirtualList/virtual.ts:158-171、165-173、179-186）。
  - 更新 `range` 并触发组件渲染（src/components/VirtualList/virtual.ts:270-277）。
  - 根据 `range` 渲染窗口内子项，前后填充撑起滚动（src/components/VirtualList/index.tsx:345-374、376-389）。
- 关键算法：索引偏移累计（src/components/VirtualList/virtual.ts:240-256）、二分近似定位滚动索引（src/components/VirtualList/virtual.ts:202-221）、前后填充计算（src/components/VirtualList/virtual.ts:298-304、310-326）。
- 使用建议：`keeps` 设置为约 2–3 屏并行渲染，`size` 估算高度尽量贴近真实内容，`pageMode/headerSize` 结合 SSR 首屏时传入（src/components/VirtualList/index.tsx:206、105-107）。

## 引入

```tsx
import VirtualList, { VirtualListRef } from "@/components/VirtualList";
```

## Props

- `data`: 数据源数组
- `dataKey`: 唯一键（字符串键或函数）
- `item`: 子项渲染组件或渲染函数
- `keeps`: 视窗内保留渲染项数量，默认 30
- `size`: 估算项高度（动态高度场景建议 80~120），默认 50
- `start`/`offset`: 初次定位（索引或像素偏移）
- `topThreshold`/`bottomThreshold`: 顶/底部触发阈值
- `itemProps`: 传入子项的附加属性
- `dataPropName`: 数据传递到子项的属性名，默认 `source`
- `height`: 列表容器高度（`number | string`），组件内部将自身作为滚动容器
- `className`/`style`: 容器样式
- 事件：`onScroll`、`onToTop`、`onToBottom`、`onResized`、`onOk`

## Ref 方法

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

## 动态高度用法要点

- 子项高度会在首次渲染以及内容变化后由 `ResizeObserver` 自动上报，无需手工计算。
- 图片、视频等内容加载完成后，高度变化会触发重新测量并更新滚动范围。
- `size` 是估算高度，用于在真实高度未测量前的平滑体验，建议根据实际内容调整到更合理的估算值。
- 列表自身应为滚动容器：通过给 `height` 传入数值或字符串（如 `600` 或 `"80vh"`）。

## 最小示例（不固定高度，图文/视频混合）

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
        <button className="rounded px-2 py-1 hover:bg-gray-100">赞 {source.likes}</button>
        <button className="rounded px-2 py-1 hover:bg-gray-100">转发 {source.reposts}</button>
        <button
          className="rounded px-2 py-1 hover:bg-gray-100"
          onClick={() => setShowComments((v) => !v)}
        >
          评论 {source.comments.length}
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
  const names = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace", "Heidi"];
  const avatar = (i: number) => `https://i.pravatar.cc/100?img=${(i % 70) + 1}`;
  const img = (seed: number) => `https://picsum.photos/seed/${seed}/600/600`;
  const poster = (seed: number) => `https://picsum.photos/seed/poster-${seed}/800/450`;
  const videoSrc = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
  const items: FeedItem[] = [];
  for (let i = 0; i < count; i++) {
    const hasImages = Math.random() < 0.65;
    const imageCount = hasImages ? Math.floor(Math.random() * 9) : 0;
    const hasVideo = !hasImages && Math.random() < 0.5;
    const commentsCount = Math.floor(Math.random() * 5);
    items.push({
      id: `post-${i}`,
      author: { name: names[i % names.length], avatar: avatar(i) },
      createdAt: new Date(Date.now() - i * 3600_000).toLocaleString(),
      text: [
        "这是一个不固定高度的示例帖子",
        "虚拟列表根据内容自动测量高度",
        "支持展开评论与动态内容变更",
      ]
        .slice(0, 1 + Math.floor(Math.random() * 3))
        .join("\n"),
      images: Array.from({ length: imageCount }).map((_, k) => img(i * 10 + k)),
      video: hasVideo ? { src: videoSrc, poster: poster(i) } : undefined,
      likes: Math.floor(Math.random() * 500),
      reposts: Math.floor(Math.random() * 200),
      comments: Array.from({ length: commentsCount }).map((_, k) => ({
        id: `c-${i}-${k}`,
        user: names[(i + k) % names.length],
        avatar: avatar(i + k),
        text: ["太赞了！", "学习了", "看看效果", "不错的实现", "有点意思"][k % 5],
      })),
    });
  }
  return items;
}

export default function Page() {
  const ref = useRef<VirtualListRef>(null);
  const [scrollInfo, setScrollInfo] = useState<{
    offset: number;
    clientSize: number;
    scrollSize: number;
  } | null>(null);
  const [data, setData] = useState<FeedItem[]>(() => makeFeed(1000));
  const moreData = useMemo(() => makeFeed(300), []);

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">虚拟列表示例</h1>
        <button
          className="rounded border px-3 py-1 text-sm"
          onClick={() => setData((prev) => [...prev, ...moreData])}
        >
          增加更多帖子
        </button>
      </div>
      <div className="rounded border p-3 text-xs">
        {scrollInfo ? (
          <div>
            offset: {scrollInfo.offset} | client: {scrollInfo.clientSize} | scroll:{" "}
            {scrollInfo.scrollSize}
          </div>
        ) : (
          <div>滚动信息显示区</div>
        )}
      </div>
      <div>
        <VirtualList
          ref={ref}
          data={data}
          dataKey="id"
          item={ItemComp}
          keeps={60}
          size={100}
          height={800}
          onScroll={(p) => setScrollInfo(p)}
        />
      </div>
    </div>
  );
}
```

## 注意事项

- 保证 `dataKey` 生成的唯一键稳定且可序列化为字符串。
- 容器滚动必须由 VirtualList 自身处理：通过 `height` 传入固定高度或百分比/视口高度。
- 动态内容加载（图片/视频/评论展开）会自动触发尺寸测量，无需手动调用。
- 若估算高度与真实高度差异过大，可适当调整 `size` 以改善滚动体验。
