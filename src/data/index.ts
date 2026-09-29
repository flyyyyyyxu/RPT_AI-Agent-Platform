/**
 * mock 数据的唯一入口：页面、组件和 core 只从这里引用，不直接引用 base/ 或 scenarios/ 下的文件。
 *   base/       基础演示数据，按功能拆分
 *   scenarios/  演示剧本 A / B / C 的数据
 */
export { DEMO_NOW } from './base/demo';
export * from './base/agents';
export * from './base/create';
export * from './base/build';
export * from './base/evaluation';
export * from './base/release';
export * from './base/monitor';
export * from './base/trace';
export * from './base/library';
export * from './base/settings';
export * from './base/ops';
export * from './scenarios';
