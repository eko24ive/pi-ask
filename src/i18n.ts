import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

type Params = Record<string, string | number>;
type Translate = (key: string, fallback: string, params?: Params) => string;

let translate: Translate = (_key, fallback, params) => format(fallback, params);

function format(text: string, params?: Params): string {
	if (!params) return text;
	return text.replace(/\{(\w+)\}/g, (_match, key: string) =>
		String(params[key] ?? `{${key}}`)
	);
}

export function t(key: string, fallback: string, params?: Params): string {
	return translate(key, fallback, params);
}

const bundles = [
	{
		locale: "es",
		namespace: "pi-ask",
		messages: {
			"tool.label": "Preguntar al usuario",
			"tool.description": "Herramienta interactiva de aclaración para casos en los que el siguiente paso depende de preferencias del usuario, requisitos faltantes o elegir entre varias direcciones válidas. Haz una entrevista breve y estructurada, recoge respuestas normalizadas y continúa usando esas respuestas explícitamente en vez de adivinar. Soporta preguntas de selección única, selección múltiple y panel de vista previa. Incluye siempre un `value` legible por máquina para cada opción. Usa `preview` solo cuando todas las opciones incluyan texto `preview`; las descripciones por sí solas no bastan.",
			"tool.promptSnippet": "Aclara decisiones ambiguas o sensibles a preferencias con una entrevista interactiva corta antes de continuar",
			"ui.other": "Escribir otra respuesta",
			"ui.submit": "Enviar",
			"ui.elaborate": "Aclarar",
			"ui.cancel": "Cancelar",
			"ui.noPreview": "No hay vista previa disponible",
			"ui.noteTitle": "Nota:",
			"ui.reviewTitle": "Revisar respuestas",
			"ui.unanswered": "→ sin responder",
			"ui.inputPlaceholder": "Escribe una respuesta...",
			"ui.notePlaceholder": "Agrega una nota...",
			"result.cancelled": "Cancelado",
			"result.submitted": "Enviado",
			"result.elaborated": "Aclaración solicitada",
		},
	},
	{
		locale: "fr",
		namespace: "pi-ask",
		messages: {
			"tool.label": "Demander à l’utilisateur",
			"tool.description": "Outil de clarification interactif pour les cas où la suite dépend des préférences de l’utilisateur, d’exigences manquantes ou d’un choix entre plusieurs directions valides. Pose un court entretien structuré, recueille des réponses normalisées, puis continue en utilisant explicitement ces réponses au lieu de deviner. Prend en charge les questions à choix unique, choix multiple et panneau d’aperçu. Inclue toujours une valeur `value` lisible par machine pour chaque option. Utilise `preview` uniquement si chaque option contient un texte `preview`; les descriptions seules ne suffisent pas.",
			"tool.promptSnippet": "Clarifie les décisions ambiguës ou sensibles aux préférences avec un court entretien interactif avant de continuer",
			"ui.other": "Écrire une autre réponse",
			"ui.submit": "Envoyer",
			"ui.elaborate": "Clarifier",
			"ui.cancel": "Annuler",
			"ui.noPreview": "Aucun aperçu disponible",
			"ui.noteTitle": "Note :",
			"ui.reviewTitle": "Vérifier les réponses",
			"ui.unanswered": "→ sans réponse",
			"ui.inputPlaceholder": "Saisir une réponse...",
			"ui.notePlaceholder": "Ajouter une note...",
			"result.cancelled": "Annulé",
			"result.submitted": "Envoyé",
			"result.elaborated": "Clarification demandée",
		},
	},
	{
		locale: "pt-BR",
		namespace: "pi-ask",
		messages: {
			"tool.label": "Perguntar ao usuário",
			"tool.description": "Ferramenta interativa de esclarecimento para casos em que o próximo passo depende de preferências do usuário, requisitos ausentes ou escolha entre várias direções válidas. Faça uma entrevista curta e estruturada, colete respostas normalizadas e continue usando essas respostas explicitamente em vez de adivinhar. Suporta perguntas de seleção única, seleção múltipla e painel de prévia. Sempre inclua um `value` legível por máquina para cada opção. Use `preview` somente quando todas as opções tiverem texto `preview`; descrições sozinhas não bastam.",
			"tool.promptSnippet": "Esclareça decisões ambíguas ou sensíveis a preferências com uma entrevista interativa curta antes de continuar",
			"ui.other": "Digitar outra resposta",
			"ui.submit": "Enviar",
			"ui.elaborate": "Esclarecer",
			"ui.cancel": "Cancelar",
			"ui.noPreview": "Nenhuma prévia disponível",
			"ui.noteTitle": "Nota:",
			"ui.reviewTitle": "Revisar respostas",
			"ui.unanswered": "→ sem resposta",
			"ui.inputPlaceholder": "Digite uma resposta...",
			"ui.notePlaceholder": "Adicionar uma nota...",
			"result.cancelled": "Cancelado",
			"result.submitted": "Enviado",
			"result.elaborated": "Esclarecimento solicitado",
		},
	},
];

export function initI18n(pi: ExtensionAPI): void {
	const events = pi.events;
	if (!events) return;
	for (const bundle of bundles) events.emit("pi-core/i18n/registerBundle", bundle);
	events.emit("pi-core/i18n/requestApi", {
		namespace: "pi-ask",
		callback(api: { t?: Translate } | undefined) {
			if (typeof api?.t === "function") translate = api.t;
		},
	});
}
