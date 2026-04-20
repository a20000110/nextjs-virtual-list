import { ReactNode, useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * 单个虚拟项容器
 * - 包裹真实子项组件，并负责测量其实际高度
 * - 通过 ResizeObserver 监听尺寸变化，向父虚拟列表上报高度
 * - 支持不固定高度内容（文本/图片/视频/展开区域）
 */

type ItemExtraProps = Record<string, unknown>;

interface Props<TSource extends Record<string, unknown> = Record<string, unknown>> {
  /** 当前项在数据源中的索引 */
  index: number;
  /** 当前项的数据对象 */
  source: TSource;
  /** 子项渲染函数/组件，接收合并后的 props */
  children: (props: ItemExtraProps) => ReactNode;
  /** 唯一键，用于尺寸映射与 React key */
  uniqueKey: string | number;
  /** 传递给子项的附加属性（例如样式/事件处理） */
  itemProps?: ItemExtraProps;
  /** 子项期望接收数据的 prop 名称，默认 'source' */
  dataPropsName?: string;
  /** 尺寸上报回调：当高度变化或初次渲染时调用 */
  itemResize: (uniqueKey: Props<TSource>["uniqueKey"], size: number) => void;
}

export default function VirtualItem<TSource extends Record<string, unknown>>(
  props: Props<TSource>
): ReactNode {
  const {
    children,
    uniqueKey,
    itemResize,
    itemProps = {},
    dataPropsName = "source",
    index,
    source,
  } = props;

  // 根容器引用，用于读取 offsetHeight
  const rootRef = useRef<HTMLDivElement>(null);
  // ResizeObserver 实例引用，便于挂载/卸载
  const resizeObserver = useRef<ResizeObserver | null>(null);

  /**
   * 尺寸变化事件
   * @description: 通知父组件当前项的高度
   */
  const dispatchSizeChange = useCallback((): void => {
    const size = rootRef.current ? rootRef.current.offsetHeight : 0; // 当前项的高度
    itemResize?.(uniqueKey, size);
  }, [uniqueKey, itemResize]);

  useEffect(() => {
    if (typeof ResizeObserver !== "undefined") {
      // 监听元素尺寸变化
      resizeObserver.current = new ResizeObserver((): void => {
        dispatchSizeChange();
      });
      // 创建观察者实例并传入回调函数
      if (rootRef.current) {
        resizeObserver.current.observe(rootRef.current);
      }
    }

    return () => {
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
        resizeObserver.current = null;
      }
    };
  }, [dispatchSizeChange]);

  useLayoutEffect(() => {
    // 初次渲染或依赖变更（index/source）后同步测量，避免首帧错位
    dispatchSizeChange();
  }, [dispatchSizeChange, index, source]);

  const merged: ItemExtraProps = {
    ...itemProps,
    index,
    [dataPropsName]: source,
  };

  return (
    <div key={uniqueKey} ref={rootRef} data-virtual-index={`virtual-index-${index + 1}`}>
      {children(merged)}
    </div>
  );
}
