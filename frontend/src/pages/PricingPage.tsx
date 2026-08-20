import { useTitle } from '../lib/hooks';

const PLANS = [
  {
    name: 'MVP 全免费',
    price: '¥0',
    period: '永久',
    highlight: true,
    desc: '验证「上传 → 渲染 → 复制/导出」免费闭环',
    features: [
      '浏览与搜索全部模板',
      '填充变量、实时渲染',
      '复制 / 导出 JSON / Markdown / API 请求体',
      '创建只读分享链接',
      '创作者：编辑器 + 变量系统 + 版本管理',
    ],
  },
  {
    name: '创作者 Pro（V2 预告）',
    price: '¥29',
    period: '/ 月',
    highlight: false,
    desc: '创作者进阶工具与数据',
    features: ['数据看板进阶', '私有（不上架）模板无限', 'API 渲染额度 10k 次/月', '自定义分享域名'],
  },
  {
    name: '企业版（V3 预告）',
    price: '¥50,000',
    period: '/ 年起',
    highlight: false,
    desc: '私有化部署 + SLA + 合规',
    features: ['私有化部署（开源版+商业授权）', '席位授权 ¥200/人/年', '批量采购折扣', '专属审核通道 + SLA'],
  },
];

export default function PricingPage() {
  useTitle('定价');
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold">定价</h1>
        <p className="mx-auto mt-3 max-w-2xl text-gray-500 dark:text-gray-400">
          当前 <b>MVP 阶段全部模板免费</b>。我们先用免费闭环验证供需，付费交易（买断 / 订阅 / 模板包）将在 V2 开放。
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-2xl border p-6 ${
              p.highlight
                ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10'
                : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
            }`}
          >
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{p.price}</span>
              <span className="text-sm text-gray-400">{p.period}</span>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{p.desc}</p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-gray-600 dark:text-gray-300">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-blue-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">V2 付费模式预告</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['单模板买断', '一次付费永久使用（含后续免费更新）', '¥1 ~ ¥99'],
            ['模板包（Pack）', '多个模板打包出售', '¥19.9 ~ ¥199'],
            ['创作者订阅', '订阅创作者全部模板 + 后续新作', '¥9.9 ~ ¥49/月'],
            ['平台会员（V3）', '订阅平台精选库', '¥29/月'],
          ].map(([t, d, p]) => (
            <div key={t} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-950">
              <div className="font-medium">{t}</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{d}</div>
              <div className="mt-2 font-mono text-sm text-blue-500">{p}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          分成机制：创作者 70% / 平台 30%；拉新期新创作者首 3 笔订单平台仅抽 10%。
        </p>
      </div>
    </div>
  );
}
