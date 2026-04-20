"use client";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import VirtualItem from "./Item";
import type { Range } from "./types";
import Virtual from "./virtual";

type DataSource = Record<string, unknown>;
type ItemComponentProps = Record<string, unknown>;
type DataKey<T extends DataSource = DataSource> = keyof T | ((item: T) => string | number);

interface VirtualListProps<T extends DataSource = DataSource> {
  data: T[];
  dataKey: DataKey<T>;
  item: React.ComponentType<ItemComponentProps>;
  keeps?: number;
  size?: number;
  start?: number;
  offset?: number;
  topThreshold?: number;
  bottomThreshold?: number;
  itemProps?: ItemComponentProps;
  dataPropName?: string;
  height?: number | string;
  pageMode?: boolean;
  headerSize?: number;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (payload: { offset: number; clientSize: number; scrollSize: number }) => void;
  onToTop?: () => void;
  onToBottom?: () => void;
  onResized?: (id: string | number, size: number) => void;
  onOk?: () => void;
}

export interface VirtualListRef {
  scrollToBottom: (smooth?: boolean) => void;
  getSizes: () => number;
  getSize: (id: string) => number | undefined;
  getOffset: () => number;
  getScrollSize: () => number;
  getClientSize: () => number;
  scrollToOffset: (offset: number, smooth?: boolean) => void;
  scrollToIndex: (index: number, smooth?: boolean, topDistance?: number) => void;
}

const VirtualList = forwardRef<VirtualListRef, VirtualListProps<DataSource>>((props, ref) => {
  /*
   * 组件概览（内部说明）
   *
   * 功能定位：
   * - 在任何时刻仅渲染可视窗口附近的少量数据项（由 range.start/end 控制），以提升大列表滚动性能。
   * - 通过子项尺寸上报（ResizeObserver）动态维护每个数据项的高度映射，支持不固定高度的内容。
   * - 根据滚动偏移、估算/已测尺寸，计算前后填充（padFront/padBehind）来撑起正确的滚动条高度。
   * - 支持两种滚动模式：整页（pageMode=true，使用 window 滚动）与容器（内部 div 滚动）。
   * - 提供 headerSize（整页模式）以扣减页头/首屏 SSR 高度，实现 SSR+CSR 组合场景下的索引与偏移对齐。
   *
   * Props 要点：
   * - data/dataKey：数据源与唯一键（字符串字段或函数），唯一键用于尺寸映射与 React key。
   * - keeps：窗口内保留的渲染数量（含前后缓冲），影响滚动平滑与内存占用。
   * - size：估算项高度（动态高度项未测量前的兜底值）。
   * - pageMode/height/headerSize：滚动模式、容器高度与页头高度扣减（SSR 首屏结合）。
   * - 事件：onScroll（统一滚动通知）、onToTop/onToBottom（到顶/到底触发）、onResized（子项尺寸上报）、onOk（初始化完成）。
   *
   * 生命周期与数据流：
   * 1. 初始化 installVirtual → 创建 Virtual 核心实例，计算初始范围；
   * 2. 绑定滚动与尺寸事件（根据 pageMode）→ onScrollHandler 调用 virtual.handleScroll；
   * 3. 子项通过 VirtualItem 的 ResizeObserver 上报尺寸 → virtual.saveSize 更新尺寸映射与平均值；
   * 4. Virtual 根据偏移与尺寸计算新的显示范围与填充 → onRangeChanged 通知组件更新；
   * 5. 通过 range 渲染窗口内的子项，配合 padFront/padBehind 保持正确滚动高度；
   *
   * 注意事项：
   * - 在整页模式下，务必传递准确的 headerSize 以避免滚动覆盖索引错位（特别是 SSR 首屏内容存在时）。
   * - keeps 值过小会导致滚动时频繁切换范围，过大则增加内存占用与初次渲染成本，建议按视窗大小与项高度估算。
   * - 子项高度变化频繁时（如展开/图片加载），ResizeObserver 可确保范围与填充及时更新，但仍建议保持样式稳定。
   */
  const {
    data,
    dataKey,
    item,
    keeps = 30,
    size = 50,
    start = 0,
    offset = 0,
    topThreshold = 0,
    bottomThreshold = 0,
    itemProps,
    dataPropName = "source",
    height,
    pageMode = false,
    headerSize = 0,
    className,
    style,
    onScroll,
    onToTop,
    onToBottom,
    onResized,
    onOk,
  } = props;

  // 当前渲染范围（包含起止索引与两侧填充）
  const [range, setRange] = useState<Range | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shepherd = useRef<HTMLDivElement | null>(null);
  const virtual = useRef<Virtual | null>(null);

  const getSize = useCallback((id: string) => {
    return virtual.current?.sizes.get(id);
  }, []);

  // 统一获取当前滚动偏移（pageMode：window；容器模式：rootRef）
  const getOffset = useCallback(() => {
    if (pageMode) {
      const d = document.documentElement;
      const b = document.body;
      const top = Math.ceil(window.scrollY || d.scrollTop || (b && b.scrollTop) || 0);
      return top;
    }
    return rootRef.current ? Math.ceil(rootRef.current.scrollTop) : 0;
  }, [pageMode]);

  // 统一获取视窗高度（pageMode：window；容器模式：clientHeight）
  const getClientSize = useCallback(() => {
    if (pageMode) {
      return Math.ceil(window.innerHeight || document.documentElement.clientHeight || 0);
    }
    return rootRef.current ? Math.ceil(rootRef.current.clientHeight) : 0;
  }, [pageMode]);

  // 统一获取滚动总高度（pageMode：document；容器模式：scrollHeight）
  const getScrollSize = useCallback(() => {
    if (pageMode) {
      const d = document.documentElement;
      const b = document.body;
      const sh = Math.ceil((d && d.scrollHeight) || (b && b.scrollHeight) || 0);
      return sh;
    }
    return rootRef.current ? Math.ceil(rootRef.current.scrollHeight) : 0;
  }, [pageMode]);

  // 派发滚动相关事件（统一 onScroll、到顶/到底触发）
  const emitEvent = useCallback(
    (curOffset: number, clientSizeVal: number, scrollSizeVal: number) => {
      onScroll?.({ offset: curOffset, clientSize: clientSizeVal, scrollSize: scrollSizeVal });
      if (virtual.current?.isFront() && !!data.length && curOffset - topThreshold <= 0) {
        onToTop?.();
      } else if (
        virtual.current?.isBehind() &&
        curOffset + clientSizeVal + bottomThreshold >= scrollSizeVal
      ) {
        onToBottom?.();
      }
    },
    [onScroll, onToTop, onToBottom, data.length, topThreshold, bottomThreshold]
  );

  // 滚动处理入口：计算偏移与视窗信息后驱动 Virtual 更新范围
  const onScrollHandler = useCallback(() => {
    const curOffset = getOffset();
    const clientSizeVal = getClientSize();
    const scrollSizeVal = getScrollSize();
    if (curOffset < 0 || curOffset + clientSizeVal > scrollSizeVal + 1 || !scrollSizeVal) {
      return;
    }
    virtual.current?.handleScroll(curOffset);
    emitEvent(curOffset, clientSizeVal, scrollSizeVal);
  }, [emitEvent, getClientSize, getOffset, getScrollSize]);

  // 唯一键数组：用于尺寸映射与范围计算
  const uniqueIds = useMemo((): string[] => {
    return data.map((dataSource: DataSource): string => {
      const id = typeof dataKey === "function" ? dataKey(dataSource) : dataSource[dataKey];
      return String(id);
    });
  }, [data, dataKey]);

  // 范围更新回调：由 Virtual 通知组件渲染窗口更新
  const onRangeChanged = useCallback((newRange: Range): void => {
    setRange(newRange);
  }, []);

  // 初始化 Virtual 实例：传入参数（包含 headerSize 等）并设置初始范围
  const installVirtual = useCallback((): void => {
    virtual.current = new Virtual(
      {
        slotHeaderSize: headerSize,
        slotFooterSize: 0,
        keeps,
        estimateSize: size,
        buffer: Math.round(keeps / 3),
        uniqueIds,
      },
      onRangeChanged
    );
    setRange(virtual.current.getRange());
  }, [keeps, size, uniqueIds, onRangeChanged, headerSize]);

  // 滚动到指定像素偏移（支持平滑滚动）
  const scrollToOffset = useCallback(
    (nextOffset: number, smooth = false) => {
      if (pageMode) {
        window.scrollTo({ left: 0, top: nextOffset, behavior: smooth ? "smooth" : "auto" });
      } else if (rootRef.current) {
        rootRef.current.scroll({ left: 0, top: nextOffset, behavior: smooth ? "smooth" : "auto" });
      }
    },
    [pageMode]
  );

  // 子项尺寸上报：保存尺寸并通知业务回调
  const onItemResized = useCallback(
    (id: string | number, sizeVal: number) => {
      if (typeof id === "string") {
        virtual.current?.saveSize(id, sizeVal);
      } else {
        virtual.current?.saveSize(String(id), sizeVal);
      }
      onResized?.(id, sizeVal);
    },
    [onResized]
  );

  // 递归滚动到底部：用于聊天/时间线场景末尾定位
  const scrollToBottom = useCallback(
    (smooth?: boolean) => {
      const loop = () => {
        if (shepherd.current) {
          const nextOffset = shepherd.current.offsetTop;
          scrollToOffset(nextOffset, smooth);
          setTimeout(() => {
            if (getOffset() + getClientSize() < getScrollSize()) {
              loop();
            }
          }, 3);
        }
      };
      loop();
    },
    [getClientSize, getOffset, getScrollSize, scrollToOffset]
  );

  // 按索引滚动定位：将索引换算为像素偏移
  const scrollToIndex = useCallback(
    (index: number, smooth?: boolean, topDistance = 0) => {
      if (index >= data.length - 1) {
        scrollToBottom(smooth);
      } else {
        const nextOffset = (virtual.current?.getOffset(index) || 0) - topDistance;
        scrollToOffset(nextOffset, smooth);
      }
    },
    [data.length, scrollToBottom, scrollToOffset]
  );

  // 返回已测量尺寸的项数量（便于调试/监控）
  const getSizes = useCallback(() => {
    return virtual.current?.sizes.size || 0;
  }, []);

  // 初始化与销毁 Virtual
  useEffect(() => {
    installVirtual();
    return () => {
      virtual.current?.destroy();
    };
  }, [installVirtual]);

  // 数据源变化：刷新唯一键并调整范围
  useEffect(() => {
    virtual.current?.updateParam("uniqueIds", uniqueIds);
    virtual.current?.handleDataSourcesChange();
  }, [uniqueIds]);

  // 窗口保留数量变化：更新 keeps 并触发范围重算
  useEffect(() => {
    virtual.current?.updateParam("keeps", keeps);
    virtual.current?.handleSlotSizeChange();
  }, [keeps]);

  // 页头高度变化：更新 slotHeaderSize（仅 pageMode 有意义）
  useEffect(() => {
    virtual.current?.updateParam("slotHeaderSize", headerSize);
    virtual.current?.handleSlotSizeChange();
  }, [headerSize]);

  // 初始按索引定位
  useEffect(() => {
    if (start) {
      scrollToIndex(start);
    }
  }, [start, scrollToIndex]);

  // 初始按偏移定位
  useEffect(() => {
    if (offset) {
      scrollToOffset(offset);
    }
  }, [offset, scrollToOffset]);

  // 初始化完成通知
  useEffect(() => {
    onOk?.();
  }, [onOk]);

  // 整页模式绑定滚动/尺寸事件
  useEffect(() => {
    if (pageMode) {
      window.addEventListener("scroll", onScrollHandler, { passive: true });
      window.addEventListener("resize", onScrollHandler);
      return () => {
        window.removeEventListener("scroll", onScrollHandler);
        window.removeEventListener("resize", onScrollHandler);
      };
    }
  }, [pageMode, onScrollHandler]);

  // 暴露实例方法给父组件（滚动控制与尺寸/偏移查询）
  useImperativeHandle(ref, () => ({
    scrollToBottom,
    getSizes,
    getSize,
    getOffset,
    getScrollSize,
    getClientSize,
    scrollToOffset,
    scrollToIndex,
  })); 

  // 根据范围渲染窗口内子项（其余由前后填充撑起滚动）
  const renderSlots = useMemo((): React.ReactNode[] | null => {
    if (!range) return null;
    const slots: React.ReactNode[] = [];
    const { start: s, end } = range;
    for (let index = s; index <= end; index++) {
      const dataSource = data[index] as DataSource | undefined;
      if (dataSource) {
        const uniqueKey = typeof dataKey === "function" ? dataKey(dataSource) : dataSource[dataKey];
        if (typeof uniqueKey === "string" || typeof uniqueKey === "number") {
          const Comp = item;
          slots.push(
            <VirtualItem
              key={String(uniqueKey)}
              index={index}
              uniqueKey={uniqueKey}
              source={dataSource}
              itemProps={itemProps}
              dataPropsName={dataPropName}
              itemResize={onItemResized}
            >
              {(p): React.ReactNode => React.createElement(Comp, p)}
            </VirtualItem>
          );
        }
      }
    }
    return slots;
  }, [range, data, dataKey, item, itemProps, dataPropName, onItemResized]);

  // 前/后填充高度（用于占位以保持滚动高度）
  const padFront = range?.padFront || 0;
  const padBehind = range?.padBehind || 0;

  // 根样式：容器模式限定高度与滚动；整页模式交由 window 控制
  const rootStyle: React.CSSProperties = {
    ...(style || {}),
    ...(pageMode
      ? {}
      : {
          height: typeof height === "number" ? `${height}px` : height,
          overflow: "auto",
        }),
  };

  return (
    <div
      ref={rootRef}
      onScroll={pageMode ? undefined : onScrollHandler}
      className={className}
      style={rootStyle}
    >
      <div style={{ padding: `${padFront}px 0px ${padBehind}px` }}>{renderSlots}</div>
      <div ref={shepherd} style={{ width: "100%", height: "0px" }} />
    </div>
  );
});

VirtualList.displayName = "VirtualList";

export default VirtualList;
