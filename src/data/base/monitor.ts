/** 监控：趋势数据与调用日志。 */
import type { MonitorProfile, MonitorProfileId } from '../../types/domain';

/* ------------------------------------------------------------------ */
/* 监控数据                                                            */
/* ------------------------------------------------------------------ */

const days = ['09-22', '09-23', '09-24', '09-25', '09-26', '09-27', '09-28'];
const series = (calls: number[], p95: number[], errorRate: number[], tokensPerCall: number) =>
  days.map((label, index) => ({ label, calls: calls[index], p95: p95[index], errorRate: errorRate[index], tokens: Math.round(calls[index] * tokensPerCall) }));

const logs = (latencies: string[], tokens: string[], failedIndex = 2) => ['16:13', '16:09', '16:02', '15:56', '15:48', '15:41'].map((time, index) => ({
  time: `2026-09-28 ${time}`, trace: `tr_9f2${(0xa01 - index * 0x5d).toString(16)}`, status: index === failedIndex ? '失败' as const : '成功' as const, latency: latencies[index], tokens: tokens[index],
}));

export const monitorProfiles: Record<MonitorProfileId, MonitorProfile> = {
  general: {
    period: '近 7 日', compareLabel: '较上周',
    changes: { calls: { direction: 'up', value: '8.4%' }, p95: { direction: 'down', value: '0.18s' }, errorRate: { direction: 'down', value: '0.2%' }, tokens: { direction: 'up', value: '6.2%' } },
    series: series([1120, 1280, 1350, 1490, 1620, 1580, 1760], [1520, 1480, 1420, 1380, 1310, 1280, 1240], [0.9, 0.8, 0.8, 0.7, 0.7, 0.6, 0.6], 1300),
    logs: logs(['1.24s', '1.18s', '2.06s', '1.43s', '1.31s', '1.12s'], ['1,284', '1,106', '864', '1,352', '1,297', '1,041']),
  },
  a: {
    period: '近 7 日', compareLabel: '较上周',
    changes: { calls: { direction: 'up', value: '6.1%' }, p95: { direction: 'down', value: '40ms' }, errorRate: { direction: 'down', value: '0.1%' }, tokens: { direction: 'up', value: '5.4%' } },
    series: series([1024000, 1068000, 1102000, 1156000, 1210000, 1188000, 1236000], [860, 845, 850, 832, 828, 824, 820], [0.4, 0.4, 0.4, 0.3, 0.3, 0.3, 0.2], 620),
    logs: logs(['0.81s', '0.77s', '1.92s', '0.84s', '0.79s', '0.80s'], ['612', '598', '402', '640', '605', '617']),
  },
  b: {
    period: '近 7 日', compareLabel: '较上周',
    changes: { calls: { direction: 'up', value: '2.3%' }, p95: { direction: 'down', value: '70ms' }, errorRate: { direction: 'down', value: '0.1%' }, tokens: { direction: 'up', value: '2.9%' } },
    series: series([352000, 368000, 341000, 395000, 402000, 288000, 276000], [2860, 2840, 2910, 2780, 2750, 2800, 2790], [0.4, 0.3, 0.3, 0.3, 0.2, 0.2, 0.2], 1900),
    logs: logs(['2.64s', '2.51s', '4.80s', '2.77s', '2.60s', '2.48s'], ['1,912', '1,874', '1,206', '1,960', '1,893', '1,851']),
  },
  c: {
    period: '近 7 日', compareLabel: '较上周',
    changes: { calls: { direction: 'up', value: '11.2%' }, p95: { direction: 'down', value: '90ms' }, errorRate: { direction: 'down', value: '0.1%' }, tokens: { direction: 'up', value: '10.8%' } },
    series: series([82000, 84500, 86100, 88200, 91800, 95600, 98400], [1980, 1960, 1940, 1920, 1950, 1910, 1890], [0.7, 0.7, 0.8, 0.6, 0.6, 0.6, 0.5], 2400),
    logs: logs(['1.92s', '1.84s', '3.40s', '1.97s', '1.88s', '1.79s'], ['2,418', '2,306', '1,520', '2,471', '2,390', '2,288']),
  },
  blank: {
    period: '近 7 日', compareLabel: '较上周', changes: null,
    series: series([12, 18, 9, 22, 30, 16, 25], [700, 680, 690, 660, 650, 670, 640], [0, 0, 0, 0, 0, 0, 0], 400),
    logs: logs(['0.64s', '0.66s', '0.70s', '0.62s', '0.65s', '0.63s'], ['402', '388', '410', '395', '401', '392'], -1),
  },
  fresh: {
    period: '发布后 1 小时', compareLabel: '', changes: null,
    series: ['+10 分', '+20 分', '+30 分', '+40 分', '+50 分', '+60 分'].map((label, index) => ({ label, calls: [6, 11, 9, 14, 12, 17][index], p95: [1380, 1320, 1290, 1310, 1260, 1250][index], errorRate: 0, tokens: [8, 14, 12, 18, 15, 22][index] * 1000 })),
    logs: logs(['1.25s', '1.31s', '1.22s', '1.29s', '1.34s', '1.27s'], ['1,262', '1,318', '1,204', '1,297', '1,344', '1,251'], -1),
  },
};
