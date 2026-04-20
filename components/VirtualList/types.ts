export interface Range {
  start: number;
  end: number;
  padFront: number;
  padBehind: number;
}

export interface VirtualParam {
  slotHeaderSize: number;
  slotFooterSize: number;
  keeps: number;
  estimateSize: number;
  buffer: number;
  uniqueIds: string[];
}

export type RangeUpdateCallback = (range: Range) => void;
