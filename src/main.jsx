
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const CUSTOMER_NAME = 'Recarga Fácil';
const CUSTOMER_EMAIL = 'contato@recargaprefacil.online';

/* =====================================================
   CHECKOUTS POR OPERADORA
===================================================== */

const NEXFAY_CHECKOUTS = {
  vivo: {
    20: 'https://nexfay.com.br/c/recarga-vivo-r-20-7xz4',
    25: 'https://nexfay.com.br/c/recarga-vivo-r-25-ecrl',
    30: 'https://nexfay.com.br/c/recarga-vivo-r-30-z3xb',
    35: 'https://nexfay.com.br/c/recarga-vivo-r-35-8v48',
    40: 'https://nexfay.com.br/c/recarga-vivo-r-40-jd78',
    50: 'https://nexfay.com.br/c/recarga-vivo-r-50-k9d6',
    60: 'https://nexfay.com.br/c/recarga-vivo-r-60-dv5a',
    70: 'https://nexfay.com.br/c/recarga-vivo-r-70-00-uy05',
    100: 'https://nexfay.com.br/c/recarga-vivo-r-100-w0ai'
  },

  claro: {
    20: 'https://nexfay.com.br/c/recarga-claro-r-20-4086',
    25: 'https://nexfay.com.br/c/recarga-claro-r-25-5kdb',
    30: 'https://nexfay.com.br/c/recarga-claro-r-30-f8up',
    35: 'https://nexfay.com.br/c/recarga-claro-r-35-m89n',
    40: 'https://nexfay.com.br/c/recarga-claro-r-40-7qp9',
    50: 'https://nexfay.com.br/c/recarga-claro-r-50-vp8w',
    60: 'https://nexfay.com.br/c/recarga-claro-r-60-ry7s',
    70: 'https://nexfay.com.br/c/recarga-claro-r-70-i7jy',
    100: 'https://nexfay.com.br/c/recarga-claro-r-100-4bjl'
  },

  tim: {
    20: 'https://xyronbot.com.br/c/recarga-tim-r-20',
    25: 'https://xyronbot.com.br/c/recarga-tim-r-25',
    30: 'https://xyronbot.com.br/c/recarga-tim-r-30',
    35: 'https://xyronbot.com.br/c/recarga-tim-r-35',
    40: 'https://xyronbot.com.br/c/recarga-tim-r-40',
    50: 'https://xyronbot.com.br/c/recarga-tim-r-50',
    60: 'https://xyronbot.com.br/c/recarga-tim-r-60',
    70: 'https://xyronbot.com.br/c/recarga-tim-r-70',
    100: 'https://xyronbot.com.br/c/recarga-tim-r-100'
  },

  surf: {},
  correios: {
     20: 'https://xyronbot.com.br/c/recarga-correios-pre-pago-20',
    25: 'https://xyronbot.com.br/c/recarga-correios-pre-pago-25',
    30: 'https://xyronbot.com.br/c/recarga-correios-pre-pago-30',
    35: 'https://xyronbot.com.br/c/recarga-correios-pre-pago-35',
    40: 'https://xyronbot.com.br/c/recarga-correios-pre-pago-40',
    50: 'https://xyronbot.com.br/c/recarga-correios-pre-pago-50',
    60: 'https://xyronbot.com.br/c/recarga-correios-pre-pago-60',
    70: 'https://xyronbot.com.br/c/recarga-correios-pre-pago-70',
    100: 'https://xyronbot.com.br/c/recarga-correios-pre-pago-100'
  },
  algar: {}
};

/* =====================================================
   IDENTIFICAÇÃO AUTOMÁTICA DO CHECKOUT
===================================================== */

function getCheckoutProvider(checkoutUrl) {
  if (!checkoutUrl) {
    return null;
  }

  try {
    const hostname = new URL(checkoutUrl).hostname
      .toLowerCase()
      .replace(/^www\./, '');

    if (
      hostname === 'nexfay.com.br' ||
      hostname.endsWith('.nexfay.com.br')
    ) {
      return 'NexFay';
    }

    if (
      hostname === 'xyronbot.com.br' ||
      hostname.endsWith('.xyronbot.com.br')
    ) {
      return 'Xyronbot';
    }

    return hostname;
  } catch {
    return 'parceiro externo';
  }
}

/* =====================================================
   OPERADORAS
===================================================== */

const operators = {
  algar: {
    slug: 'algar',
    name: 'Algar',
    logo: '/assets/images/algar.png',
    color: '#00A859',
    soft: '#E8F7EF',
    bonus: 'Até 8 GB de bônus',
    banner: '/assets/images/banner-algar.png'
  },

  claro: {
    slug: 'claro',
    name: 'Claro',
    logo: '/assets/images/claro.png',
    color: '#E60000',
    soft: '#FFE8E8',
    bonus: 'Até 5 GB de bônus',
    banner: '/assets/images/banner-claro.png'
  },

  correios: {
    slug: 'correios',
    name: 'Correios Celular',
    logo: '/assets/images/correios.png',
    color: '#00416B',
    soft: '#EAF3F8',
    bonus: 'Até 6 GB de bônus',
    banner: '/assets/images/banner-correios.png'
  },

  surf: {
    slug: 'surf',
    name: 'Surf Telecom',
    logo: '/assets/images/surf.png',
    color: '#0000F9',
    soft: '#E8E8FF',
    bonus: 'Até 10 GB de bônus',
    banner: '/assets/images/banner-surf.png'
  },

  tim: {
    slug: 'tim',
    name: 'TIM',
    logo: '/assets/images/tim.png',
    color: '#0033A0',
    soft: '#E8EEFF',
    bonus: 'Até 10 GB de bônus',
    banner: '/assets/images/banner-tim.png'
  },

  vivo: {
    slug: 'vivo',
    name: 'Vivo',
    logo: '/assets/images/vivo.png',
    color: '#660099',
    soft: '#F3E8FA',
    bonus: 'Até 12 GB de bônus',
    banner: '/assets/images/banner-vivo.png'
  }
};

/* =====================================================
   VALORES E BÔNUS
===================================================== */

const values = [20, 25, 30, 35, 40, 50, 60, 70, 100];

const bonusByValue = {
  20: '4 GB',
  25: '6 GB',
  30: '8 GB',
  35: '10 GB',
  40: '14 GB',
  50: '20 GB',
  60: '25 GB',
  70: '32 GB',
  100: '50 GB'
};

const planBonus = value =>
  `${bonusByValue[value] || '4 GB'} • 30 dias`;

const money = value =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);

const onlyDigits = value =>
  String(value || '').replace(/\D/g, '').slice(0, 11);

const formatPhone = value => {
  const d = onlyDigits(value);

  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;

  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

function path() {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

function go(to) {
  window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}

/* =====================================================
   CABEÇALHO
===================================================== */

function Header() {
  const openOperators = () => {
    if (path() === '/') {
      document.getElementById('operadoras')?.scrollIntoView({
        behavior: 'smooth'
      });
    } else {
      go('/');

      setTimeout(() => {
        document.getElementById('operadoras')?.scrollIntoView({
          behavior: 'smooth'
        });
      }, 50);
    }
  };

  return (
    <header className="topbar">
      <button className="brand" onClick={() => go('/')}>
        <span className="brand-mark">↗</span>
        <span>Recarga <b>Fácil</b></span>
      </button>

      <nav>
        <a href="#operadoras">Operadoras</a>
        <a href="#como-funciona">Como funciona</a>
        <a href="#duvidas">Dúvidas</a>
      </nav>

      <button className="header-cta" onClick={openOperators}>
        Fazer recarga <span>→</span>
      </button>
    </header>
  );
}

/* =====================================================
   RODAPÉ
===================================================== */

function Footer() {
  return (
    <footer>
      <div>
        <strong>Recarga Fácil</strong>
        <p>Plataforma digital para recargas de linhas pré-pagas.</p>
        <p>Recargas para seu número ou para outra pessoa.</p>
      </div>

      <div>
        <strong>Atalhos</strong>
        <a href="#operadoras">Escolher operadora</a>
        <a href="#como-funciona">Como funciona</a>
        <a href="#duvidas">Dúvidas frequentes</a>
      </div>

      <div>
        <strong>Transparência</strong>
        <p>Razão Social: Safe Check & Cia LTDA</p>
        <p>CNPJ: 07.917.274/0001-99</p>
        <a href={`mailto:${CUSTOMER_EMAIL}`}>
          {CUSTOMER_EMAIL}
        </a>
      </div>

      <div className="footer-legal">
        <a href="/termos-de-uso.html">Termos de Uso</a>
        <a href="/politica-de-privacidade.html">
          Política de Privacidade
        </a>
      </div>

      <small>
        © {new Date().getFullYear()} Recarga Fácil. Todos os direitos reservados.
      </small>
    </footer>
  );
}

/* =====================================================
   DEPOIMENTOS
===================================================== */

function Testimonials() {
  const testimonials = [
    [
      'O processo foi fácil de entender e o pagamento via Pix facilitou bastante.',
      'Cliente Recarga Fácil'
    ],
    [
      'Gostei de poder escolher o valor e conferir os dados antes de pagar.',
      'Cliente Recarga Fácil'
    ],
    [
      'A página é simples de usar e consegui encontrar a recarga que procurava.',
      'Cliente Recarga Fácil'
    ],
    [
      'Foi prático informar o número e seguir direto para o pagamento via Pix.',
      'Cliente Recarga Fácil'
    ],
    [
      'A apresentação do valor e do bônus deixou a escolha mais clara para mim.',
      'Cliente Recarga Fácil'
    ]
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % testimonials.length);
    }, 4200);

    return () => clearInterval(timer);
  }, [testimonials.length]);

  const visible = [0, 1, 2].map(
    offset => testimonials[(index + offset) % testimonials.length]
  );

  return (
    <section className="testimonials-section">
      <div className="testimonials-heading">
        <div>
          <span className="eyebrow">A EXPERIÊNCIA DE QUEM RECARREGA</span>
          <h2>Uma experiência simples do começo ao fim.</h2>
        </div>

        <div className="testimonial-controls">
          <button
            aria-label="Depoimento anterior"
            onClick={() =>
              setIndex(i => (i - 1 + testimonials.length) % testimonials.length)
            }
          >
            ←
          </button>

          <button
            aria-label="Próximo depoimento"
            onClick={() =>
              setIndex(i => (i + 1) % testimonials.length)
            }
          >
            →
          </button>
        </div>
      </div>

      <div className="testimonial-track" aria-live="polite">
        {visible.map(([text, author], i) => (
          <article
            className={`testimonial-card ${i === 0 ? 'testimonial-active' : ''}`}
            key={`${index}-${i}`}
          >
            <span className="quote-mark">“</span>
            <p>{text}</p>
            <strong>{author}</strong>
          </article>
        ))}
      </div>

      <div className="testimonial-dots">
        {testimonials.map((_, i) => (
          <button
            key={i}
            aria-label={`Mostrar depoimento ${i + 1}`}
            className={i === index ? 'active' : ''}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}

/* =====================================================
   PÁGINA INICIAL
===================================================== */

function Home() {
  const [faq, setFaq] = useState(null);

  const faqs = [
    [
      'Posso recarregar o celular de outra pessoa?',
      'Sim. Você pode informar o número de outra pessoa, escolher a operadora correspondente e selecionar o valor da recarga.'
    ],
    [
      'Preciso criar uma conta?',
      'Não. O processo foi pensado para ser simples e não exige criação de conta para iniciar a recarga.'
    ],
    [
      'Quais operadoras são atendidas?',
      'A plataforma apresenta opções para Vivo, Claro, TIM, Surf Telecom, Correios Celular e Algar.'
    ],
    [
      'Quais valores estão disponíveis?',
      'Estão disponíveis recargas de R$20, R$25, R$30, R$35, R$40, R$50, R$60, R$70 e R$100.'
    ],
    [
      'Como faço o pagamento?',
      'Depois de informar o número e escolher o valor, você segue para o checkout correspondente à recarga. As formas de pagamento disponíveis são apresentadas nessa etapa.'
    ],
    [
      'A recarga é para celular pré-pago?',
      'Sim. A plataforma é destinada a recargas de linhas pré-pagas nas operadoras disponíveis.'
    ]
  ];

  return (
    <>
      <Header />

      <main className="home home-new">
        <section className="top-banner">
          <div className="home-banner home-banner-top">
            <img
              src="/assets/images/banner-recarga.png"
              alt="Recarga rápida e segura de celular"
            />

            <button
              className="banner-cta"
              onClick={() =>
                document.getElementById('operadoras')?.scrollIntoView({
                  behavior: 'smooth'
                })
              }
            >
              Escolher minha operadora <span>→</span>
            </button>
          </div>
        </section>

        <Testimonials />

        <section id="operadoras" className="operators-section home-operators">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ESCOLHA UMA OPÇÃO</span>
              <h2>Qual é a sua operadora?</h2>
            </div>

            <p>
              Selecione a operadora e siga para
              <br />
              a página exclusiva de recarga.
            </p>
          </div>

          <div className="operator-grid">
            {Object.values(operators).map(op => (
              <button
                className="operator-card"
                key={op.slug}
                onClick={() => go(`/recarga-${op.slug}`)}
              >
                <span
                  className="operator-logo"
                  style={{ background: op.soft }}
                >
                  <img src={op.logo} alt={op.name} />
                </span>

                <span>
                  <strong>{op.name}</strong>
                  <small>{op.bonus}</small>
                </span>

                <b className="arrow">↗</b>
              </button>
            ))}
          </div>
        </section>

        <section className="content-section why-section">
          <div className="content-heading">
            <span className="eyebrow">SIMPLES DO COMEÇO AO FIM</span>
            <h2>
              Por que recarregar seu celular pré-pago pela Recarga Fácil?
            </h2>
          </div>

          <div className="feature-list">
            <div><span>✓</span><strong>Processo simples e transparente.</strong></div>
            <div><span>✓</span><strong>Escolha a operadora e o valor da sua recarga.</strong></div>
            <div><span>✓</span><strong>Pagamento em checkout online.</strong></div>
            <div><span>✓</span><strong>Atendimento para recargas pré-pagas.</strong></div>
            <div><span>✓</span><strong>Recarga para o seu próprio número ou para outra pessoa.</strong></div>
            <div><span>✓</span><strong>Valores de R$20 a R$100.</strong></div>
            <div><span>✓</span><strong>Opções com bônus de internet.</strong></div>
            <div><span>✓</span><strong>Experiência simples, sem necessidade de criar conta.</strong></div>
          </div>
        </section>

        <section id="como-funciona" className="content-section info-section">
          <div className="content-heading centered-heading">
            <span className="eyebrow">INFORMAÇÕES SOBRE RECARGA PRÉ-PAGA</span>
            <h2>Entenda como funciona.</h2>
          </div>

          <div className="info-cards">
            <article>
              <span className="info-number">01</span>
              <h3>Pagamento pelo checkout</h3>
              <p>
                Escolha sua recarga e siga para o ambiente de pagamento
                correspondente. As opções de pagamento são apresentadas nessa etapa.
              </p>
            </article>

            <article>
              <span className="info-number">02</span>
              <h3>Valores de R$20 a R$100</h3>
              <p>
                Escolha entre as opções disponíveis de recarga, com bônus
                de internet apresentados nos cards.
              </p>
            </article>

            <article>
              <span className="info-number">03</span>
              <h3>Para qualquer operadora pré-paga</h3>
              <p>
                Atendemos Vivo, Claro, TIM, Surf Telecom, Correios e Algar.
                Informe o número que receberá a recarga — pode ser o seu
                celular ou o de outra pessoa.
              </p>
            </article>
          </div>
        </section>

        <section className="content-section everything-section">
          <div className="content-heading">
            <span className="eyebrow">TUDO SOBRE SUA RECARGA PRÉ-PAGA</span>
            <h2>Recarga de celular pré-pago online.</h2>
          </div>

          <div className="article-grid">
            <article>
              <h3>Recarga de celular pré-pago online</h3>
              <p>
                Fazer uma recarga pré-paga pela Recarga Fácil é simples:
                informe o número que receberá a recarga, escolha a operadora,
                selecione um valor disponível e siga para o pagamento.
              </p>
            </article>

            <article>
              <h3>Crédito para o celular de outra pessoa</h3>
              <p>
                A recarga não precisa ser para o seu próprio número. Basta
                informar o número que receberá a recarga, escolher a operadora
                da linha e o valor desejado.
              </p>
            </article>

            <article>
              <h3>Valores de R$20 a R$100</h3>
              <p>
                Na Recarga Fácil, estão disponíveis recargas de R$20, R$25,
                R$30, R$35, R$40, R$50, R$60, R$70 e R$100. As opções de
                recarga também apresentam informações sobre bônus de internet
                quando disponíveis.
              </p>
            </article>

            <article>
              <h3>Pagamento online</h3>
              <p>
                O pagamento é realizado no checkout indicado para a operadora
                e o valor escolhidos. Confira os dados e as condições
                apresentados antes de concluir.
              </p>
            </article>
          </div>
        </section>

        <section id="duvidas" className="faq home-faq">
          <span className="eyebrow">PERGUNTAS FREQUENTES</span>
          <h2>Perguntas frequentes sobre recarga pré-paga</h2>

          {faqs.map(([question, answer], i) => (
            <div
              className={`faq-row ${faq === i ? 'open' : ''}`}
              key={question}
            >
              <button onClick={() => setFaq(faq === i ? null : i)}>
                <span>{question}</span>
                <b>{faq === i ? '−' : '+'}</b>
              </button>

              {faq === i && <p>{answer}</p>}
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </>
  );
}

/* =====================================================
   PÁGINA DE RECARGA DA OPERADORA
===================================================== */

function OperatorPage({ operator }) {
  const operatorCheckouts = NEXFAY_CHECKOUTS[operator.slug] || {};

  const availableValues = values.filter(value =>
    Boolean(operatorCheckouts[value])
  );

  const [phone, setPhone] = useState('');

  const [selected, setSelected] = useState(() => {
    return availableValues[0] || 20;
  });

  const [error, setError] = useState('');
  const [faq, setFaq] = useState(null);

  // Atualiza a seleção quando o usuário muda de operadora.
  useEffect(() => {
    const firstAvailable = values.find(value =>
      Boolean(operatorCheckouts[value])
    );

    setSelected(firstAvailable || 20);
    setPhone('');
    setError('');
    setFaq(null);
  }, [operator.slug]);

  const hasCheckouts = availableValues.length > 0;

  const selectedCheckout = operatorCheckouts[selected] || '';
  const checkoutProvider = getCheckoutProvider(selectedCheckout);

  const submit = e => {
    e.preventDefault();
    setError('');

    const phoneDigits = onlyDigits(phone);
    const amount = Number(selected);

    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      return setError('Informe um número de celular válido.');
    }

    if (!values.includes(amount)) {
      return setError('Escolha um valor de recarga válido.');
    }

    const checkoutUrl = operatorCheckouts[amount];

    if (!checkoutUrl) {
      return setError(
        `O checkout de ${money(amount)} para ${operator.name} ainda não está disponível.`
      );
    }

    const data = {
      name: CUSTOMER_NAME,
      email: CUSTOMER_EMAIL,
      phone: formatPhone(phone),
      operator: operator.slug,
      operatorName: operator.name,
      amount,
      bonus: planBonus(amount),
      checkoutProvider
    };

    try {
      sessionStorage.setItem('recargaData', JSON.stringify(data));
    } catch {
      return setError(
        'Não foi possível salvar os dados desta recarga. Verifique as configurações do navegador.'
      );
    }

    window.location.assign(checkoutUrl);
  };

  return (
    <>
      <Header />

      <main
        className="recharge-page operator-modern"
        style={{
          '--operator': operator.color,
          '--operator-soft': operator.soft
        }}
      >
        <section className="operator-top-banner">
          <img
            src={operator.banner}
            alt={`Recarga ${operator.name} Online`}
          />
        </section>

        <form className="operator-main-card" onSubmit={submit}>
          <div className="operator-intro">
            <div className="operator-logo-large">
              <img src={operator.logo} alt={operator.name} />
            </div>

            <h1>Recarga {operator.name} Online</h1>

            <button
              type="button"
              className="change-operator"
              onClick={() => go('/')}
            >
              Não é {operator.name}? <strong>Trocar operadora</strong>
            </button>

            <p>
              Sua {operator.name} sempre conectada! Escolha o valor da
              recarga, confira os dados e siga para o checkout.
            </p>
          </div>

          <div className="operator-form-section">
            <div className="operator-step-title">
              <span>1</span>
              <div>
                <strong>Informe o número</strong>
                <small>
                  Digite o celular {operator.name} que receberá a recarga.
                </small>
              </div>
            </div>

            <label className="field-label" htmlFor="phone">
              Número do celular
            </label>

            <input
              id="phone"
              className="phone-input"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={e => {
                setPhone(formatPhone(e.target.value));
                setError('');
              }}
              required
            />

            <div className="helper">
              ✓ Você pode recarregar o seu número ou o celular de outra pessoa.
            </div>
          </div>

          <div className="operator-values-section">
            <div className="operator-step-title">
              <span>2</span>
              <div>
                <strong>Escolha o valor da recarga</strong>
                <small>Selecione uma das opções abaixo.</small>
              </div>
            </div>

            <div className="modern-value-grid">
              {values.map(value => {
                const available = Boolean(operatorCheckouts[value]);

                return (
                  <button
                    type="button"
                    key={value}
                    disabled={!available}
                    className={`modern-value-option ${selected === value ? 'active' : ''} ${!available ? 'unavailable' : ''}`}
                    aria-disabled={!available}
                    onClick={() => {
                      if (!available) return;

                      setSelected(value);
                      setError('');
                    }}
                  >
                    <div>
                      <span>
                        {available ? 'CHECKOUT DISPONÍVEL' : 'INDISPONÍVEL'}
                      </span>

                      <strong>{money(value)}</strong>
                    </div>

                    <div className="modern-bonus">
                      <b>+{bonusByValue[value]}</b>
                      <small>BÔNUS DE INTERNET</small>
                      <em>30 dias</em>
                    </div>

                    {value === 30 && <label>MAIS ESCOLHIDO</label>}
                  </button>
                );
              })}
            </div>

            {operator.slug === 'vivo' ? (
              <p className="bonus-note">
                Os nove checkouts da Vivo estão configurados.
                Selecione o valor desejado para continuar.
              </p>
            ) : hasCheckouts ? (
              <p className="bonus-note">
                {availableValues.length} valor(es) com checkout configurado
                para {operator.name}. Selecione uma opção disponível.
              </p>
            ) : (
              <p className="bonus-note">
                Os valores estão preparados para esta operadora.
                Os checkouts serão habilitados assim que os respectivos
                links forem adicionados.
              </p>
            )}
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modern-checkout">
            <div>
              <small>Total da recarga</small>
              <strong>{money(selected)}</strong>
              <span>+{bonusByValue[selected]} de bônus • 30 dias</span>
            </div>

            <button
              className="primary"
              type="submit"
              disabled={!selectedCheckout}
            >
              {selectedCheckout
                ? 'Continuar para pagamento'
                : 'Checkout indisponível'}
              <span>→</span>
            </button>
          </div>
        </form>

        <section className="operator-trust-row">
          <div>
            <b>✓ Checkout online</b>
            <span>
              {selectedCheckout
                ? `Pagamento em ambiente ${checkoutProvider}.`
                : 'Checkout ainda não configurado para este valor.'}
            </span>
          </div>

          <div>
            <b>✓ Confira seus dados</b>
            <span>Verifique o número antes de continuar.</span>
          </div>

          <div>
            <b>✓ Sem cadastro</b>
            <span>Você não precisa criar uma conta.</span>
          </div>
        </section>

        <section id="duvidas" className="faq operator-faq">
          <span className="eyebrow">DÚVIDAS FREQUENTES</span>
          <h2>Sobre sua recarga {operator.name}.</h2>

          {[
            'Posso recarregar o celular de outra pessoa?',
            'Preciso criar uma conta?',
            'Quais valores estão disponíveis?',
            'Como faço o pagamento?'
          ].map((q, i) => (
            <div
              className={`faq-row ${faq === i ? 'open' : ''}`}
              key={q}
            >
              <button onClick={() => setFaq(faq === i ? null : i)}>
                <span>{q}</span>
                <b>{faq === i ? '−' : '+'}</b>
              </button>

              {faq === i && (
                <p>
                  {i === 0
                    ? `Sim. Basta informar o número ${operator.name} que receberá a recarga.`
                    : i === 1
                      ? 'Não. O fluxo de recarga não exige criação de conta.'
                      : i === 2
                        ? hasCheckouts
                          ? `Existem ${availableValues.length} valores com checkout configurado para esta operadora.`
                          : 'Os valores estão preparados, mas os links de checkout ainda serão adicionados.'
                        : selectedCheckout
                          ? `O pagamento será realizado no checkout ${checkoutProvider}.`
                          : 'O checkout ainda não está configurado para esta operadora.'}
                </p>
              )}
            </div>
          ))}
        </section>
      </main>

      <Footer />
    </>
  );
}

/* =====================================================
   APLICAÇÃO E ROTAS
===================================================== */

function App() {
  const [, refresh] = useState(0);

  useEffect(() => {
    const fn = () => refresh(x => x + 1);

    window.addEventListener('popstate', fn);

    return () => {
      window.removeEventListener('popstate', fn);
    };
  }, []);

  const currentPath = path().replace(/\.html$/, '');

  if (currentPath === '/pagamento') {
    const saved = (() => {
      try {
        return JSON.parse(
          sessionStorage.getItem('recargaData') || '{}'
        );
      } catch {
        return {};
      }
    })();

    const operator = operators[saved.operator];

    if (operator) {
      return <OperatorPage operator={operator} />;
    }

    return <Home />;
  }

  if (currentPath.startsWith('/recarga-')) {
    const slug = currentPath.replace('/recarga-', '');

    const operator = operators[slug];

    if (operator) {
      return <OperatorPage operator={operator} />;
    }

    return <Home />;
  }

  return <Home />;
}

createRoot(document.getElementById('root')).render(<App />);
