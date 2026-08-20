import { useTitle } from '../lib/hooks';

function DocShell({ title, children }: { title: string; children: React.ReactNode }) {
  useTitle(title);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{children}</div>
    </div>
  );
}

export function TermsPage() {
  return (
    <DocShell title="服务条款">
      <p>欢迎使用 PromptFlow（提示流）。本服务条款为占位文本，正式上线前将补充完整法律条款。</p>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">1. 服务说明</h2>
      <p>PromptFlow 是面向 AI 从业者的「带变量的链式工作流 Prompt 模板」交易市场，提供模板浏览、渲染、导出与创作服务。</p>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">2. 内容合规</h2>
      <p>
        创作者上架内容须遵守法律法规与平台禁止清单（禁止生成恶意软件、钓鱼页面、违规内容等类模板），违者将被拒收或下架并承担相应责任。
      </p>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">3. 账号与行为</h2>
      <p>请妥善保管账号凭证，不得利用本服务进行任何危害平台、他人或违反法律法规的行为。</p>
      <p className="text-xs text-gray-400">（本页为 MVP 占位条款，正式文本以法务定稿为准。）</p>
    </DocShell>
  );
}

export function PrivacyPage() {
  return (
    <DocShell title="隐私政策">
      <p>本隐私政策为占位文本。PromptFlow 重视您的隐私，正式上线前将补充完整隐私条款。</p>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">1. 我们收集的信息</h2>
      <p>账号信息（用户名、邮箱、密码哈希）、模板创作内容、渲染与导出调用记录（脱敏后用于统计）。</p>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">2. 变量数据用途</h2>
      <p>您在模板中填写的变量值仅用于本地/服务端渲染，平台对渲染埋点做脱敏处理，不用于画像之外的第三方交易。</p>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">3. 您的权利</h2>
      <p>您可随时查看、修改或删除您的账号与创作数据，或联系我们注销账号。</p>
      <p className="text-xs text-gray-400">（本页为 MVP 占位条款，正式文本以法务定稿为准。）</p>
    </DocShell>
  );
}
