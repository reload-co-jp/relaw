import Link from "next/link"
import "./reset.css"
import "./theme.css"

export const metadata = {
  title: "Relaw",
  description: "法案・法令ライフサイクルモニタリングシステム",
}

const navLinks = [
  { href: "/", label: "ホーム" },
  { href: "/bills/", label: "法案" },
  { href: "/gantt/", label: "ガントチャート" },
  { href: "/laws/", label: "法令" },
  { href: "/public-comments/", label: "パブリックコメント" },
]

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="ja">
      <body>
        <header className="site-header">
          <div className="container site-header-inner">
            <Link href="/" className="brand">
              Relaw
            </Link>
            <span className="brand-tagline">
              法案・法令ライフサイクルモニタリング
            </span>
            <nav style={{ marginLeft: "auto" }}>
              <ul className="site-nav">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>
        <main className="site-main">
          <div className="container">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="container">
            <p>
              Relaw — 法案・法令ライフサイクルモニタリング。
              データはすべて公的情報源から毎日収集。
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
export default RootLayout
