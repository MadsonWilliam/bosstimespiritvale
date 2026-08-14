import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade e consentimento",
  description:
    "O que o Nojos Boss Time Spirit Vale guarda (quase nada) e o que ele nunca coleta.",
  robots: { index: true, follow: true },
};

const BLOCKS = [
  {
    pt: {
      h: "Nenhum dado pessoal é coletado",
      p: "Não pedimos e-mail, telefone, nome real, documento, localização nem qualquer outro dado que identifique você como pessoa. Não existe cadastro, não existe conta e não há login social.",
    },
    en: {
      h: "No personal data is collected",
      p: "We do not ask for an email, phone number, real name, ID, location or anything else that identifies you as a person. There is no sign-up, no account and no social login.",
    },
  },
  {
    pt: {
      h: "O que é guardado",
      p: "Apenas o nickname fictício que você digita, um PIN de 4 dígitos guardado de forma cifrada (hash com salt), e os reportes que você enviar: mapa, channel, servidor, horário informado e posição da lápide. Nada disso identifica uma pessoa real.",
    },
    en: {
      h: "What is stored",
      p: "Only the fictional nickname you type, a 4-digit PIN kept hashed with a salt, and the reports you submit: map, channel, server, reported time and tombstone position. None of it identifies a real person.",
    },
  },
  {
    pt: {
      h: "O nickname é público e sujeito a disponibilidade",
      p: "O nick aparece no ranking e ao lado dos reportes. Ele é um apelido de jogo, não uma identidade. Quem registrar primeiro fica com ele; não há transferência, recuperação nem verificação de que você é o dono daquele personagem no jogo.",
    },
    en: {
      h: "The nickname is public and first-come, first-served",
      p: "Your nick shows up on the ranking and next to your reports. It is a game handle, not an identity. Whoever registers it first keeps it; there is no transfer, no recovery and no check that you own that character in game.",
    },
  },
  {
    pt: {
      h: "O PIN não é uma senha de verdade",
      p: "Ele existe só para outra pessoa não gastar a sua reputação. Nunca use um PIN que você usa em banco, cartão ou qualquer conta real. Ele fica salvo no seu navegador para não precisar digitar toda vez, e não recupera nada se você esquecer.",
    },
    en: {
      h: "The PIN is not a real password",
      p: "It exists only to stop someone else spending your reputation. Never reuse a PIN from a bank, card or any real account. It is kept in your browser so you do not retype it, and it recovers nothing if you forget it.",
    },
  },
  {
    pt: {
      h: "Preferências ficam no seu navegador",
      p: "Fuso horário, formato de hora, idioma e servidor escolhido são salvos apenas no localStorage do seu dispositivo. Não são enviados para o servidor e somem se você limpar os dados do navegador.",
    },
    en: {
      h: "Preferences stay in your browser",
      p: "Timezone, time format, language and chosen server live only in your device's localStorage. They are never sent to the server and disappear if you clear browser data.",
    },
  },
  {
    pt: {
      h: "Os dados podem estar errados",
      p: "Tudo é enviado pela comunidade, sem validação automática. Timers vencidos e não preenchidos são comuns — o boss pode ter morrido sem ninguém avisar. Use como apoio, não como verdade absoluta.",
    },
    en: {
      h: "The data can be wrong",
      p: "Everything is community-submitted with no automatic validation. Expired, unreported timers are common — a boss may have died with nobody saying so. Treat it as a hint, not gospel.",
    },
  },
  {
    pt: {
      h: "Quer apagar seu nick?",
      p: "Pare de usá-lo e ele deixa de acumular pontos. Como não há dado pessoal associado, não há o que ser desvinculado de você. Se ainda assim quiser a remoção do registro, é só pedir pelo canal de contato do projeto.",
    },
    en: {
      h: "Want your nick removed?",
      p: "Stop using it and it stops earning points. Since no personal data is attached, there is nothing tied to you to unlink. If you still want the record deleted, just ask through the project's contact channel.",
    },
  },
];

export default function PrivacyPage() {
  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/"
        className="text-xs font-semibold text-muted underline-offset-4 transition-colors hover:text-spirit hover:underline"
      >
        ← Nojos Boss Time
      </Link>

      <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">
        Privacidade e consentimento
        <span className="mt-1 block text-lg font-bold text-muted">Privacy and consent</span>
      </h1>

      <div className="mt-10 space-y-8">
        {BLOCKS.map((b) => (
          <section key={b.pt.h} className="panel-flat p-5">
            <h2 className="text-base font-bold text-ink">{b.pt.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{b.pt.p}</p>
            <div className="hairline my-4" />
            <h3 className="text-sm font-bold text-faint">{b.en.h}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-faint">{b.en.p}</p>
          </section>
        ))}
      </div>

      <p className="mt-10 rounded-xl border border-edge bg-abyss/60 p-5 text-xs leading-relaxed text-faint">
        Projeto de fã, sem fins lucrativos. Não é afiliado, patrocinado nem endossado pela
        Baikun Interactive. SpiritVale e todo o material do jogo pertencem aos seus
        respectivos donos.
        <span className="mt-2 block">
          Non-profit fan project. Not affiliated with, sponsored or endorsed by Baikun
          Interactive. SpiritVale and all game material belong to their respective owners.
        </span>
      </p>
    </main>
  );
}
