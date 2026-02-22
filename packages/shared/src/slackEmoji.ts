import { emojify } from "node-emoji";

const SLACK_SKIN_TONE_RE = /::skin-tone-\d+:/g;

/**
 * Converts Slack emoji shortcodes (e.g. :tada:, :wave::skin-tone-4:) to Unicode emoji.
 * Strips skin-tone modifiers before conversion since node-emoji doesn't handle them.
 */
export function slackEmojiToUnicode(text: string): string {
  const withoutSkinTone = text.replace(SLACK_SKIN_TONE_RE, "");
  return emojify(withoutSkinTone);
}
