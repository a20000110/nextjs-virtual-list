/**
 * @file 虚拟滚动核心逻辑文件 - (构造函数)
 * @description 主要用于虚拟滚动计算和管理
 * @param {Object} param 定制参数
 * @param {Function} callUpdate 回调
 */
import type { Range, RangeUpdateCallback, VirtualParam } from "./types";

enum CalcType {
  INIT = "INIT",
  FIXED = "FIXED",
  DYNAMIC = "DYNAMIC",
}
enum Direction {
  NONE = "NONE",
  FRONT = "FRONT",
  BEHIND = "BEHIND",
}

export default class Virtual {
  sizes: Map<string, number> = new Map<string, number>(); // 存储元素的尺寸的Map对象
  offset: number = 0;
  calcType: CalcType = CalcType.INIT;
  direction: Direction = Direction.NONE;
  param: VirtualParam | null = null;
  callUpdate: RangeUpdateCallback | null = null;
  firstRangeTotalSize?: number;
  firstRangeAverageSize: number = 0;
  lastCalcIndex: number = 0;
  fixedSizeValue?: number;
  range: Range = { start: 0, end: 0, padFront: 0, padBehind: 0 };

  constructor(param: VirtualParam, callUpdate: RangeUpdateCallback) {
    this.init(param, callUpdate);
  }

  /**
   * 初始化
   * @param {object} param - 参数对象
   * @param {function} callUpdate - 更新回调函数
   */
  init(param: VirtualParam | null, callUpdate: RangeUpdateCallback | null): void {
    this.param = param;
    this.callUpdate = callUpdate;

    this.sizes = new Map();
    this.firstRangeTotalSize = 0;
    this.firstRangeAverageSize = 0;
    this.lastCalcIndex = 0;
    this.fixedSizeValue = 0;
    this.calcType = CalcType.INIT;

    this.offset = 0;
    this.direction = Direction.NONE;

    this.range = { start: 0, end: 0, padFront: 0, padBehind: 0 };
    if (param) {
      this.checkRange(0, param.keeps - 1);
    }
  }

  // 销毁整个虚拟列表实例
  destroy(): void {
    this.init(null, null);
  }

  /**
   * 获取当前范围
   * @returns {object} - 当前范围对象
   */
  getRange(): Range {
    const range = Object.create(null) as Range;
    range.start = this.range.start;
    range.end = this.range.end;
    range.padFront = this.range.padFront;
    range.padBehind = this.range.padBehind;
    return range;
  }

  isBehind(): boolean {
    return this.direction === Direction.BEHIND;
  }

  isFront(): boolean {
    return this.direction === Direction.FRONT;
  }

  getOffset(start: number): number {
    return (start < 1 ? 0 : this.getIndexOffset(start)) + (this.param?.slotHeaderSize ?? 0);
  }

  // 更新参数
  updateParam<K extends keyof VirtualParam>(key: K, value: VirtualParam[K]): void {
    if (this.param && key in this.param) {
      if (key === "uniqueIds") {
        const nextUniqueIds = value as VirtualParam["uniqueIds"];
        this.sizes.forEach((_v: number, currentKey: string) => {
          if (!nextUniqueIds.includes(currentKey)) {
            this.sizes.delete(currentKey);
          }
        });
      }
      this.param[key] = value;
    }
  }

  /**
   * 保存元素的尺寸
   * @param {string} id - 唯一标识
   * @param {number} size - 尺寸
   * @description 该方法用于保存数据项的尺寸信息。将指定id和尺寸保存到`sizes`映射中，以便后续使用
   */
  saveSize(id: string, size: number): void {
    this.sizes.set(id, size);

    // 如果当前计算类型为初始化(INIT) 将尺寸值设为固定尺寸值，并将计算类型设置为固定
    if (this.calcType === CalcType.INIT) {
      this.fixedSizeValue = size;
      this.calcType = CalcType.FIXED;
      // 如果当前计算类型固定并且固定尺寸值不等于新的尺寸
    } else if (this.calcType === CalcType.FIXED && this.fixedSizeValue !== size) {
      this.calcType = CalcType.DYNAMIC;
      this.fixedSizeValue = undefined;
    }

    if (this.calcType !== CalcType.FIXED && typeof this.firstRangeTotalSize !== "undefined" && this.param) {
      // 如果sizes映射的大小小于参数keeps和uniqueIds长度的最小值 这么做的目的是为了计算平均尺寸
      if (this.sizes.size < Math.min(this.param.keeps, this.param.uniqueIds.length)) {
        // 第一个范围的总尺
        this.firstRangeTotalSize = [...this.sizes.values()].reduce((acc, val) => acc + val, 0);
        // 第一个范围的平均尺寸
        this.firstRangeAverageSize = Math.round(this.firstRangeTotalSize / this.sizes.size);
      } else {
        this.firstRangeTotalSize = undefined;
      }
    }
  }

  /**
   * 数据变化处理
   */
  handleDataSourcesChange(): void {
    if (!this.param) {
      return;
    }
    let start = this.range.start;

    if (this.isFront()) {
      // 将起始位置向前调整2个单位
      start = start - 2;
    } else if (this.isBehind()) {
      // 将起始位置向后调整2个单位
      start = start + 2;
    }

    start = Math.max(start, 0); // 确保起始位置不小于0

    this.updateRange(this.range.start, this.getEndByStart(start));
  }

  handleSlotSizeChange(): void {
    this.handleDataSourcesChange();
  }

  /**
   * 滚动处理
   * @param offset 偏移量
   * @description 根据滚动的偏移量判断滚动的方向是向前还是向后
   */
  handleScroll(offset: number): void {
    this.direction = offset < this.offset ? Direction.FRONT : Direction.BEHIND;
    this.offset = offset;

    if (!this.param) {
      return;
    }

    if (this.direction === Direction.FRONT) {
      this.handleFront();
    } else if (this.direction === Direction.BEHIND) {
      this.handleBehind();
    }
  }

  /**
   * 向前滚动处理
   * @returns {number} 滚动的位置
   */
  handleFront(): void {
    if (!this.param) {
      return;
    }
    const overs = this.getScrollOvers();
    if (overs > this.range.start) {
      return;
    }

    const start = Math.max(overs - this.param.buffer, 0);
    this.checkRange(start, this.getEndByStart(start));
  }

  /**
   * 向后滚动处理
   * @returns {number} 滚动的位置
   */
  handleBehind(): void {
    if (!this.param) {
      return;
    }
    const overs = this.getScrollOvers();
    if (overs < this.range.start + this.param.buffer) {
      return;
    }

    this.checkRange(overs, this.getEndByStart(overs));
  }

  /**
   * 获取滚动的位置
   * @returns {number} 滚动的位置
   */
  getScrollOvers(): number {
    if (!this.param) {
      return 0;
    }
    const offset = this.offset - this.param.slotHeaderSize;
    if (offset <= 0) {
      return 0;
    }

    if (this.isFixedType()) {
      const fixedSize = this.fixedSizeValue ?? this.param.estimateSize;
      return fixedSize > 0 ? Math.floor(offset / fixedSize) : 0;
    }

    let low = 0;
    let middle = 0;
    let middleOffset = 0;
    let high = this.param.uniqueIds.length;

    while (low <= high) {
      middle = low + Math.floor((high - low) / 2);
      middleOffset = this.getIndexOffset(middle);

      if (middleOffset === offset) {
        return middle;
      } else if (middleOffset < offset) {
        low = middle + 1;
      } else if (middleOffset > offset) {
        high = middle - 1;
      }
    }

    return low > 0 ? --low : 0;
  }

  /**
   * 获取指定索引的偏移量
   * @param {number} givenIndex - 给定的索引
   * @returns {number} - 偏移量
   */
  getIndexOffset(givenIndex: number): number {
    if (!this.param) {
      return 0;
    }
    if (!givenIndex) {
      return 0;
    }

    let offset = 0;
    let indexSize: number | undefined = 0;
    for (let index = 0; index < givenIndex; index++) {
      indexSize = this.sizes.get(this.param.uniqueIds[index]);
      offset = offset + (typeof indexSize === "number" ? indexSize : this.getEstimateSize());
    }

    this.lastCalcIndex = Math.max(this.lastCalcIndex, givenIndex - 1);
    this.lastCalcIndex = Math.min(this.lastCalcIndex, this.getLastIndex());

    return offset;
  }

  isFixedType(): boolean {
    return this.calcType === CalcType.FIXED;
  }

  getLastIndex(): number {
    return this.param ? this.param.uniqueIds.length - 1 : 0;
  }

  checkRange(start: number, end: number): void {
    if (!this.param) {
      return;
    }
    const keeps = this.param.keeps;
    const total = this.param.uniqueIds.length;

    if (total <= keeps) {
      start = 0;
      end = this.getLastIndex();
    } else if (end - start < keeps - 1) {
      start = end - keeps + 1;
    }

    if (this.range.start !== start) {
      this.updateRange(start, end);
    }
  }

  // 更新范围
  updateRange(start: number, end: number): void {
    this.range.start = start;
    this.range.end = end;
    this.range.padFront = this.getPadFront();
    this.range.padBehind = this.getPadBehind();
    this.callUpdate?.(this.getRange());
  }

  getEndByStart(start: number): number {
    if (!this.param) {
      return 0;
    }
    const theoryEnd = start + this.param.keeps - 1;
    const trueEnd = Math.min(theoryEnd, this.getLastIndex());
    return trueEnd;
  }

  // 获取前方的预填充大小
  getPadFront(): number {
    if (this.isFixedType()) {
      return (this.fixedSizeValue ?? 0) * this.range.start;
    } else {
      return this.getIndexOffset(this.range.start);
    }
  }

  /**
   * 获取后方的预填充大小
   * @returns {number} - 填充大小
   */
  getPadBehind(): number {
    const end = this.range.end; // 当前显示范围的结束索引
    const lastIndex = this.getLastIndex(); // 最后一个索引

    // 如果是固定尺寸类型就直接返回固定尺寸的填充大小
    if (this.isFixedType()) {
      return (lastIndex - end) * (this.fixedSizeValue ?? 0);
    }

    // 如果上一次计算的索引等于最后一个索引，则返回当前索引的偏移量减去结束索引的偏移量
    if (this.lastCalcIndex === lastIndex) {
      return this.getIndexOffset(lastIndex) - this.getIndexOffset(end);
    } else {
      // 否则返回预估尺寸乘以剩余元素个数的填充尺寸
      return (lastIndex - end) * this.getEstimateSize();
    }
  }

  getEstimateSize(): number {
    return this.isFixedType()
      ? (this.fixedSizeValue ?? this.param?.estimateSize ?? 0)
      : this.firstRangeAverageSize || this.param?.estimateSize || 0;
  }
}
