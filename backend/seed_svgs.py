"""SVG-схемы для демо-курсов. Пишутся в uploads/ и раздаются по /static/<имя>."""
from app.config import get_settings

UP = get_settings().upload_dir

FONT = "Inter, Segoe UI, Arial, sans-serif"
MONO = "JetBrains Mono, Menlo, Consolas, monospace"


def _commit(x, y, color, label=""):
    tag = (f'<text x="{x}" y="{y + 38}" font-family="{MONO}" font-size="13" fill="#64748b" '
           f'text-anchor="middle">{label}</text>') if label else ""
    return f'<circle cx="{x}" cy="{y}" r="13" fill="#fff" stroke="{color}" stroke-width="5"/>{tag}'


GIT_FLOW = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 420" width="1000" height="420">
  <rect width="1000" height="420" rx="24" fill="#f8fafc"/>
  <text x="40" y="52" font-family="{FONT}" font-size="22" font-weight="800" fill="#0f172a">Работа в ветке и pull request</text>
  <text x="40" y="78" font-family="{FONT}" font-size="14" fill="#64748b">main всегда рабочая: всё новое попадает в неё только через ревью и зелёный CI</text>

  <text x="40" y="160" font-family="{MONO}" font-size="15" font-weight="700" fill="#1e3a8a">main</text>
  <line x1="110" y1="155" x2="950" y2="155" stroke="#1e3a8a" stroke-width="6" stroke-linecap="round"/>
  {_commit(160, 155, "#1e3a8a", "a1f3")}
  {_commit(300, 155, "#1e3a8a", "7c20")}
  {_commit(820, 155, "#16a34a", "merge")}

  <text x="40" y="300" font-family="{MONO}" font-size="15" font-weight="700" fill="#2563eb">feature/</text>
  <text x="40" y="318" font-family="{MONO}" font-size="15" font-weight="700" fill="#2563eb">LMS-142</text>
  <path d="M300 155 C 340 155, 340 290, 390 290 L 720 290 C 770 290, 780 155, 820 155"
        fill="none" stroke="#2563eb" stroke-width="6" stroke-linecap="round"/>
  {_commit(430, 290, "#2563eb", "feat: форма")}
  {_commit(560, 290, "#2563eb", "test: кейсы")}
  {_commit(690, 290, "#2563eb", "fix: ревью")}

  <rect x="555" y="190" width="230" height="58" rx="14" fill="#ffffff" stroke="#cbd5e1"/>
  <text x="575" y="214" font-family="{FONT}" font-size="14" font-weight="700" fill="#0f172a">Pull request #142</text>
  <text x="575" y="235" font-family="{FONT}" font-size="13" fill="#16a34a">✓ CI зелёный · ✓ 1 approve</text>

  <text x="300" y="398" font-family="{FONT}" font-size="13" fill="#64748b">1. git switch -c feature/LMS-142</text>
  <text x="560" y="398" font-family="{FONT}" font-size="13" fill="#64748b">2. push → PR → ревью</text>
  <text x="790" y="398" font-family="{FONT}" font-size="13" fill="#64748b">3. squash-merge</text>
</svg>'''


def _stage(x, title, sub, color):
    return (f'<rect x="{x}" y="150" width="150" height="96" rx="18" fill="#ffffff" stroke="{color}" stroke-width="3"/>'
            f'<text x="{x + 75}" y="190" font-family="{FONT}" font-size="17" font-weight="800" fill="#0f172a" '
            f'text-anchor="middle">{title}</text>'
            f'<text x="{x + 75}" y="216" font-family="{FONT}" font-size="13" fill="#64748b" text-anchor="middle">{sub}</text>')


def _arrow(x):
    return (f'<line x1="{x}" y1="198" x2="{x + 22}" y2="198" stroke="#94a3b8" stroke-width="4"/>'
            f'<path d="M{x + 22} 190 L{x + 34} 198 L{x + 22} 206 Z" fill="#94a3b8"/>')


CI_PIPELINE = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 340" width="1000" height="340">
  <rect width="1000" height="340" rx="24" fill="#f8fafc"/>
  <text x="40" y="52" font-family="{FONT}" font-size="22" font-weight="800" fill="#0f172a">Путь коммита до продакшена</text>
  <text x="40" y="78" font-family="{FONT}" font-size="14" fill="#64748b">Каждый шаг — отдельная job в GitHub Actions. Упал один — дальше не идём</text>
  {_stage(25, "Lint", "ruff · eslint", "#6366f1")}{_arrow(180)}
  {_stage(220, "Tests", "pytest · vitest", "#2563eb")}{_arrow(375)}
  {_stage(415, "Build", "docker build", "#0891b2")}{_arrow(570)}
  {_stage(610, "Staging", "авто-деплой", "#d97706")}{_arrow(765)}
  {_stage(805, "Prod", "по кнопке", "#16a34a")}
  <text x="40" y="300" font-family="{FONT}" font-size="14" fill="#334155">⏱ Цель команды: от push до staging — меньше 10 минут.</text>
  <text x="40" y="322" font-family="{FONT}" font-size="14" fill="#334155">🔒 Секреты — только в GitHub Secrets и .env на сервере, никогда в репозитории.</text>
</svg>'''


PHISHING_EMAIL = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 470" width="1000" height="470">
  <rect width="1000" height="470" rx="24" fill="#f8fafc"/>
  <rect x="40" y="40" width="560" height="390" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <text x="66" y="80" font-family="{FONT}" font-size="14" fill="#64748b">От:</text>
  <text x="100" y="80" font-family="{FONT}" font-size="14" font-weight="700" fill="#0f172a">IT Support &lt;support@nordbyte-it.help&gt;</text>
  <text x="66" y="108" font-family="{FONT}" font-size="14" fill="#64748b">Тема:</text>
  <text x="112" y="108" font-family="{FONT}" font-size="14" font-weight="700" fill="#dc2626">СРОЧНО: ваш пароль истекает через 2 часа</text>
  <line x1="66" y1="126" x2="574" y2="126" stroke="#e2e8f0"/>
  <text x="66" y="162" font-family="{FONT}" font-size="15" fill="#334155">Уважаемый сотрудник!</text>
  <text x="66" y="192" font-family="{FONT}" font-size="15" fill="#334155">Из-за обновления системы безопасности ваш</text>
  <text x="66" y="214" font-family="{FONT}" font-size="15" fill="#334155">аккаунт будет заблокирован. Подтвердите вход:</text>
  <rect x="66" y="240" width="250" height="46" rx="10" fill="#2563eb"/>
  <text x="191" y="269" font-family="{FONT}" font-size="15" font-weight="700" fill="#fff" text-anchor="middle">Подтвердить пароль</text>
  <text x="66" y="318" font-family="{MONO}" font-size="12" fill="#64748b">https://nordbyte.sso-login.ru/auth?id=8812</text>
  <text x="66" y="356" font-family="{FONT}" font-size="15" fill="#334155">Вложение: Политика_безопасности.pdf.exe</text>
  <text x="66" y="396" font-family="{FONT}" font-size="13" fill="#94a3b8">Служба поддержки IT</text>

  <g font-family="{FONT}" font-size="14" fill="#0f172a">
    <circle cx="640" cy="78" r="14" fill="#dc2626"/><text x="640" y="83" fill="#fff" font-weight="800" text-anchor="middle">1</text>
    <text x="666" y="72" font-weight="700">Чужой домен</text>
    <text x="666" y="92" fill="#64748b">nordbyte-it.help вместо nordbyte.dev</text>
    <circle cx="640" cy="148" r="14" fill="#dc2626"/><text x="640" y="153" fill="#fff" font-weight="800" text-anchor="middle">2</text>
    <text x="666" y="142" font-weight="700">Срочность и угроза</text>
    <text x="666" y="162" fill="#64748b">«через 2 часа», «заблокирован»</text>
    <circle cx="640" cy="218" r="14" fill="#dc2626"/><text x="640" y="223" fill="#fff" font-weight="800" text-anchor="middle">3</text>
    <text x="666" y="212" font-weight="700">Обезличенное обращение</text>
    <text x="666" y="232" fill="#64748b">«Уважаемый сотрудник»</text>
    <circle cx="640" cy="298" r="14" fill="#dc2626"/><text x="640" y="303" fill="#fff" font-weight="800" text-anchor="middle">4</text>
    <text x="666" y="292" font-weight="700">Ссылка ведёт не туда</text>
    <text x="666" y="312" fill="#64748b">наведите курсор — sso-login.ru</text>
    <circle cx="640" cy="368" r="14" fill="#dc2626"/><text x="640" y="373" fill="#fff" font-weight="800" text-anchor="middle">5</text>
    <text x="666" y="362" font-weight="700">Двойное расширение</text>
    <text x="666" y="382" fill="#64748b">.pdf.exe — это программа</text>
  </g>
</svg>'''


SVGS = {
    "it_git_flow.svg": GIT_FLOW,
    "it_ci_pipeline.svg": CI_PIPELINE,
    "it_phishing_email.svg": PHISHING_EMAIL,
}
