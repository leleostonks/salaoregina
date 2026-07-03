import Link from 'next/link';

export default function LandingPage() {
  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-accent">✦</span> SalonHub
          </Link>
          <nav className="hidden md:flex gap-7 text-sm text-text-muted">
            <a href="#funcionalidades" className="hover:text-accent">Funcionalidades</a>
          </nav>
          <div className="flex gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm">Entrar</Link>
            <Link href="/login" className="btn btn-primary btn-sm">Acessar painel</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-24 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(212,165,116,0.15),transparent_60%)]" />
          <div className="relative max-w-3xl mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full border border-border bg-bg-3 text-accent text-xs font-medium mb-6">
              Plataforma SaaS para o mercado de beleza
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6">
              O sistema operacional<br /><em className="text-accent not-italic">do seu salão</em>
            </h1>
            <p className="text-text-muted text-lg mb-8 max-w-xl mx-auto">
              Saiba em tempo real quanto você fatura, quem gera mais lucro e como está a saúde financeira — tudo em um único lugar.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/login" className="btn btn-primary text-base px-7 py-3">Acessar o painel</Link>
              <a href="#funcionalidades" className="btn btn-outline text-base px-7 py-3">Ver funcionalidades</a>
            </div>
          </div>
        </section>

        <section id="funcionalidades" className="py-20 px-6 bg-bg-2">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-3xl font-bold text-center mb-12">Tudo para gerir com inteligência</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { icon: '📊', title: 'Dashboard em tempo real', items: ['Faturamento diário/semanal/mensal', 'Ticket médio', 'Comparativos'] },
                { icon: '💰', title: 'Controle Financeiro', items: ['Receitas e despesas', 'Fluxo de caixa', 'Contas a pagar'] },
                { icon: '👩‍🎨', title: 'Gestão da Equipe', items: ['Ranking de profissionais', 'Comissão automática', 'Produtividade'] },
                { icon: '💇', title: 'Análise de Serviços', items: ['Mais vendidos', 'Mais lucrativos', 'Tempo médio'] },
                { icon: '👥', title: 'Clientes', items: ['Novos e recorrentes', 'Frequência de retorno', 'Histórico'] },
                { icon: '📈', title: 'Metas', items: ['Meta de faturamento', 'Por profissional', 'Tendências'] },
              ].map((f) => (
                <div key={f.title} className="card hover:border-accent-dark transition-colors">
                  <div className="text-2xl mb-3">{f.icon}</div>
                  <h3 className="font-bold mb-3">{f.title}</h3>
                  <ul className="text-sm text-text-muted space-y-1">
                    {f.items.map((i) => <li key={i}>· {i}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-text-muted">
        <p>© 2026 SalonHub. O sistema operacional do seu salão.</p>
      </footer>
    </>
  );
}
