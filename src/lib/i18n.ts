export type Lang = "pt" | "en";

export const DEFAULT_LANG: Lang = "pt";

type Dict = Record<string, string>;

const pt: Dict = {
  "app.name": "Nojos Boss Time",
  "app.subtitle": "Spirit Vale",
  "app.tagline": "Rastreador de world boss feito pela comunidade",

  "nav.maps": "Mapas",
  "nav.timers": "Timers",
  "nav.route": "Rota",
  "nav.ranking": "Ranking",

  "settings.server": "Servidor",
  "settings.timezone": "Fuso horário",
  "settings.format": "Formato",
  "settings.format.24h": "24h",
  "settings.format.12h": "12h (AM/PM)",
  "settings.language": "Idioma",
  "settings.detected": "detectado",
  "settings.open": "Ajustes",
  "settings.done": "Pronto",
  "settings.intro":
    "Antes de tudo: confirme seu fuso e o formato de hora. Todos os horários do site usam isso.",

  "identity.title": "Sua identificação",
  "identity.hint":
    "Só o nick do jogo. Nenhum dado pessoal é pedido, guardado ou compartilhado.",
  "identity.nick": "Nick no jogo",
  "identity.pin": "PIN de 4 dígitos",
  "identity.pin.hint":
    "O PIN serve só para ninguém usar seu nick. Não é senha de conta, não recupere nada com ele.",
  "identity.enter": "Entrar / registrar",
  "identity.leave": "Sair",
  "identity.anon": "Anônimo",
  "identity.anon.hint": "Você pode reportar sem se identificar — só não ganha pontos.",
  "identity.created": "Nick registrado. Bem-vindo ao Vale.",
  "identity.welcome": "Bom te ver de novo",
  "identity.badpin": "PIN incorreto para esse nick.",
  "identity.level": "Nível",
  "identity.points": "pontos",
  "identity.nextrank": "Próximo cargo",
  "identity.consent":
    "Ao registrar um nick você confirma que ele é fictício e público, e que nenhum dado pessoal é coletado.",

  "state.alive": "VIVO",
  "state.window": "NA JANELA",
  "state.waiting": "AGUARDANDO",
  "state.overdue": "VENCIDO",
  "state.stale": "SEM INFO",
  "state.unknown": "SEM DADOS",

  "state.alive.desc": "Lápide sumiu — o boss está de pé.",
  "state.window.desc": "Pode nascer a qualquer momento.",
  "state.waiting.desc": "Ainda no tempo garantido.",
  "state.overdue.desc": "Passou da janela. Provavelmente morreu sem ninguém reportar.",
  "state.stale.desc": "Informação velha demais para valer.",
  "state.unknown.desc": "Ninguém reportou esse channel ainda.",

  "timer.opens": "abre",
  "timer.closes": "fecha",
  "timer.in": "em",
  "timer.ago": "atrás",
  "timer.window": "janela",
  "timer.chance": "chance de estar vivo",
  "timer.by": "por",
  "timer.lastdeath": "última morte",

  "report.title": "Reportar",
  "report.death": "Morreu",
  "report.when": "Que horas morreu?",
  "report.placeholder": "2100, 21:00, 9pm ou -15",
  "report.hint":
    "Digite o horário e aperte Enter. Vazio = agora. Use -15 para “15 minutos atrás”.",
  "report.now": "Morreu agora",
  "report.submit": "Registrar",
  "report.channel": "Channel",
  "report.source": "Origem",
  "report.source.kill": "Morte normal",
  "report.source.summon": "Invocado com a chave",
  "report.tomb": "Lápide",
  "report.tomb.present": "Lápide está lá",
  "report.tomb.present.hint": "= ainda não nasceu",
  "report.tomb.gone": "Lápide sumiu",
  "report.tomb.gone.hint": "= boss nasceu",
  "report.saved": "Registrado. Valeu!",
  "report.error": "Não deu pra registrar",
  "report.ratelimited": "Calma aí — muitos envios seguidos.",

  "maps.title": "Mapas com boss",
  "maps.count": "26 dos 46 mapas de Spirit Vale têm world boss.",
  "maps.search": "Buscar mapa, boss ou drop…",
  "maps.filter.all": "Todos",
  "maps.filter.active": "Com timer",
  "maps.filter.unknown": "Sem info",
  "maps.nodata": "Nenhum mapa bate com esse filtro.",
  "maps.level": "Lv",
  "maps.drops": "Drops",
  "maps.tomb": "Lápide",
  "maps.tomb.pin": "Marcar lápide",
  "maps.tomb.none": "Ninguém marcou a lápide desse channel ainda.",
  "maps.tomb.click": "Clique no mapa onde está a lápide.",
  "maps.tomb.confirm": "Confirmar este ponto",
  "maps.tomb.confirmed": "Confirmado",
  "maps.tomb.votes": "confirmações",
  "maps.tomb.saved": "Ponto salvo.",
  "maps.tomb.cancel": "Cancelar",
  "maps.boss.tba": "Boss ainda não catalogado pela comunidade.",
  "maps.open": "Abrir mapa",
  "maps.close": "Fechar",

  "timers.title": "Timers do servidor",
  "timers.subtitle": "Na janela, vencendo ou vencidos há pouco.",
  "timers.empty":
    "Nenhum timer ativo neste servidor. Seja a primeira pessoa a reportar uma morte.",
  "timers.showall": "Mostrar todos os channels",
  "timers.showactive": "Mostrar só os relevantes",

  "route.title": "Rota sugerida",
  "route.subtitle":
    "Ordem com mais chance de achar boss vivo, contando o tempo de deslocamento.",
  "route.from": "Saindo de",
  "route.from.any": "Qualquer lugar",
  "route.stops": "paradas",
  "route.arrive": "chega",
  "route.chance": "chance",
  "route.hops": "mapas de distância",
  "route.hop": "mapa de distância",
  "route.here": "você está aqui",
  "route.empty":
    "Sem timers suficientes para montar uma rota. Reporte algumas mortes primeiro.",
  "route.check": "Cheque ch",
  "route.recalc": "Recalcular",

  "rank.title": "Ranking imperial",
  "rank.subtitle":
    "Cargos decorativos por contribuição. Não valem nada no jogo — valem no ego.",
  "rank.empty": "Ninguém pontuou ainda. A primeira coroa está livre.",
  "rank.reports": "reportes",
  "rank.you": "você",

  "footer.fan":
    "Projeto de fã, sem fins lucrativos. Não é afiliado, patrocinado nem endossado pela Baikun Interactive. SpiritVale e todo o material do jogo pertencem aos seus donos.",
  "footer.privacy": "Privacidade",
  "footer.privacy.short":
    "Nenhum dado pessoal é coletado. O nick é um apelido fictício de jogo, público e sujeito a disponibilidade.",
  "footer.coffee": "Pague um café pro dev",
  "footer.coffee.soon": "(link em breve)",
  "footer.data": "Dados enviados pela comunidade. Podem estar errados ou desatualizados.",

  "privacy.title": "Privacidade e consentimento",

  "common.channel": "Channel",
  "common.server": "Servidor",
  "common.cancel": "Cancelar",
  "common.loading": "Carregando…",
  "common.retry": "Tentar de novo",
  "common.error": "Algo deu errado.",
  "common.updated": "Atualizado",
};

const en: Dict = {
  "app.name": "Nojos Boss Time",
  "app.subtitle": "Spirit Vale",
  "app.tagline": "Community-run world boss tracker",

  "nav.maps": "Maps",
  "nav.timers": "Timers",
  "nav.route": "Route",
  "nav.ranking": "Ranking",

  "settings.server": "Server",
  "settings.timezone": "Timezone",
  "settings.format": "Time format",
  "settings.format.24h": "24h",
  "settings.format.12h": "12h (AM/PM)",
  "settings.language": "Language",
  "settings.detected": "detected",
  "settings.open": "Settings",
  "settings.done": "Done",
  "settings.intro":
    "First things first: confirm your timezone and time format. Every clock on the site follows it.",

  "identity.title": "Your identity",
  "identity.hint":
    "Just your in-game nick. No personal data is asked for, stored or shared.",
  "identity.nick": "In-game nick",
  "identity.pin": "4-digit PIN",
  "identity.pin.hint":
    "The PIN only stops someone else using your nick. It is not an account password and recovers nothing.",
  "identity.enter": "Sign in / register",
  "identity.leave": "Sign out",
  "identity.anon": "Anonymous",
  "identity.anon.hint": "You can report without identifying — you just earn no points.",
  "identity.created": "Nick registered. Welcome to the Vale.",
  "identity.welcome": "Good to see you again",
  "identity.badpin": "Wrong PIN for that nick.",
  "identity.level": "Level",
  "identity.points": "points",
  "identity.nextrank": "Next title",
  "identity.consent":
    "By registering a nick you confirm it is a fictional, public handle and that no personal data is collected.",

  "state.alive": "ALIVE",
  "state.window": "IN WINDOW",
  "state.waiting": "WAITING",
  "state.overdue": "OVERDUE",
  "state.stale": "NO INFO",
  "state.unknown": "NO DATA",

  "state.alive.desc": "Tombstone gone — the boss is up.",
  "state.window.desc": "Can pop at any moment.",
  "state.waiting.desc": "Still inside the guaranteed cooldown.",
  "state.overdue.desc": "Past the window. Most likely killed and never reported.",
  "state.stale.desc": "Too old to be worth anything.",
  "state.unknown.desc": "Nobody has reported this channel yet.",

  "timer.opens": "opens",
  "timer.closes": "closes",
  "timer.in": "in",
  "timer.ago": "ago",
  "timer.window": "window",
  "timer.chance": "chance it is up",
  "timer.by": "by",
  "timer.lastdeath": "last death",

  "report.title": "Report",
  "report.death": "Died",
  "report.when": "What time did it die?",
  "report.placeholder": "2100, 21:00, 9pm or -15",
  "report.hint":
    "Type the time and hit Enter. Empty = now. Use -15 for “15 minutes ago”.",
  "report.now": "Died just now",
  "report.submit": "Save",
  "report.channel": "Channel",
  "report.source": "Source",
  "report.source.kill": "Natural spawn",
  "report.source.summon": "Summoned with key",
  "report.tomb": "Tombstone",
  "report.tomb.present": "Tombstone is there",
  "report.tomb.present.hint": "= not spawned yet",
  "report.tomb.gone": "Tombstone is gone",
  "report.tomb.gone.hint": "= boss has spawned",
  "report.saved": "Saved. Thanks!",
  "report.error": "Could not save",
  "report.ratelimited": "Slow down — too many submissions.",

  "maps.title": "Maps with a boss",
  "maps.count": "26 of Spirit Vale's 46 maps hold a world boss.",
  "maps.search": "Search map, boss or drop…",
  "maps.filter.all": "All",
  "maps.filter.active": "Has timer",
  "maps.filter.unknown": "No info",
  "maps.nodata": "No map matches that filter.",
  "maps.level": "Lv",
  "maps.drops": "Drops",
  "maps.tomb": "Tombstone",
  "maps.tomb.pin": "Pin tombstone",
  "maps.tomb.none": "Nobody has pinned this channel's tombstone yet.",
  "maps.tomb.click": "Click the map where the tombstone is.",
  "maps.tomb.confirm": "Confirm this spot",
  "maps.tomb.confirmed": "Confirmed",
  "maps.tomb.votes": "confirmations",
  "maps.tomb.saved": "Spot saved.",
  "maps.tomb.cancel": "Cancel",
  "maps.boss.tba": "Boss not catalogued by the community yet.",
  "maps.open": "Open map",
  "maps.close": "Close",

  "timers.title": "Server timers",
  "timers.subtitle": "In window, expiring or recently expired.",
  "timers.empty":
    "No active timers on this server. Be the first to report a kill.",
  "timers.showall": "Show every channel",
  "timers.showactive": "Show only what matters",

  "route.title": "Suggested route",
  "route.subtitle":
    "Ordered by the odds of finding a boss alive, travel time included.",
  "route.from": "Starting from",
  "route.from.any": "Anywhere",
  "route.stops": "stops",
  "route.arrive": "arrive",
  "route.chance": "chance",
  "route.hops": "maps away",
  "route.hop": "map away",
  "route.here": "you are here",
  "route.empty":
    "Not enough timers to build a route. Report a few kills first.",
  "route.check": "Check ch",
  "route.recalc": "Recalculate",

  "rank.title": "Imperial ranking",
  "rank.subtitle":
    "Decorative titles for contributing. Worth nothing in game — everything to the ego.",
  "rank.empty": "Nobody has scored yet. The first crown is unclaimed.",
  "rank.reports": "reports",
  "rank.you": "you",

  "footer.fan":
    "Non-profit fan project. Not affiliated with, sponsored or endorsed by Baikun Interactive. SpiritVale and all game material belong to their owners.",
  "footer.privacy": "Privacy",
  "footer.privacy.short":
    "No personal data is collected. The nick is a fictional public game handle, subject to availability.",
  "footer.coffee": "Buy the dev a coffee",
  "footer.coffee.soon": "(link coming soon)",
  "footer.data": "Community-submitted data. It can be wrong or out of date.",

  "privacy.title": "Privacy and consent",

  "common.channel": "Channel",
  "common.server": "Server",
  "common.cancel": "Cancel",
  "common.loading": "Loading…",
  "common.retry": "Try again",
  "common.error": "Something went wrong.",
  "common.updated": "Updated",
};

const DICTS: Record<Lang, Dict> = { pt, en };

export function translator(lang: Lang) {
  const dict = DICTS[lang] ?? DICTS[DEFAULT_LANG];
  return (key: string): string => dict[key] ?? DICTS[DEFAULT_LANG][key] ?? key;
}

export type T = ReturnType<typeof translator>;
