export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface TracePath {
  points: Point[];
  length: number;
}

export interface Chip {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'cpu' | 'memory' | 'sensor';
}

export interface Signal {
  pathIndex: number; // Index of the trace it follows
  progress: number;  // 0 to 1
  speed: number;
  color: string;
}
