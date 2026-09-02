/**
 * Japanese strings for the LINE bot. Mirrors the keys in en.js.
 */
module.exports = {
  "link.instructions": [
    "このボットはまだあなたのアカウントに連携されていません。",
    "",
    "1. ブラウザで NexusAI にサインインする",
    "2. アカウント設定を開き、LINE 連携を開始する",
    "3. そこに表示されるコマンドを次の形式で送信する:",
    "",
    "/link あなたのユーザー名 123456",
    "",
    "コードの有効期限は5分です。切れた場合は新しいコードを発行してください。",
  ].join("\n"),
  "link.rate_limited": "失敗が続いています。{{minutes}} 分後にもう一度お試しください。",
  "link.invalid":
    "ユーザー名またはコードが正しくないか、期限切れです。NexusAI のアカウント設定から新しいコードを発行してください。",
  "link.success": "「{{username}}」として連携しました。チャットを始められます。",
  "link.success_workspace":
    "「{{workspace}}」ワークスペースでチャット中です。/help で利用できるコマンドを確認できます。",
  "link.success_no_workspace":
    "まだどのワークスペースにも参加していません。管理者にお問い合わせください。",

  "unlink.done": "連携を解除しました。/link <username> <code> でもう一度連携できます。",
  "account.gone":
    "連携されていた NexusAI アカウントは利用できなくなりました。/link <username> <code> でもう一度連携してください。",

  "help.text": [
    "利用できるコマンド:",
    "/help - このリストを表示",
    "/workspace - 現在のワークスペースとアクセスできる一覧を表示",
    "/workspace <番号> - 指定したワークスペースに切り替え",
    "/language - 返答に使う言語を表示",
    "/language <番号> - 言語を変更",
    "/unlink - この LINE アカウントと NexusAI の連携を解除",
  ].join("\n"),

  "workspace.no_access":
    "{{username}} さん、まだどのワークスペースにもアクセスできません。管理者にお問い合わせください。",
  "workspace.status":
    "現在「{{workspace}}」({{slug}}) でチャット中です。\n\nアクセスできるワークスペース:\n{{list}}\n\n/workspace <番号> で切り替えられます。",
  "workspace.not_found":
    "「{{arg}}」に一致するワークスペースがありません。/workspace で選択肢を確認してください。",
  "workspace.already": "すでに「{{workspace}}」でチャット中です。",
  "workspace.switched": "「{{workspace}}」ワークスペースに切り替えました。",

  "language.status":
    "現在の返答言語: {{language}}\n\n選択肢:\n{{list}}\n\n/language <番号> で変更できます。",
  "language.changed": "これ以降、{{language}} で返答します。",
  "language.already": "すでに {{language}} で返答しています。",
  "language.not_found":
    "「{{arg}}」に一致する選択肢がありません。/language で選択肢を確認してください。",

  "chat.no_response": "申し訳ありません。回答を生成できませんでした。",
};
